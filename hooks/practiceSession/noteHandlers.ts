import { useCallback } from 'react';
import type { MutableRefObject } from 'react';

import { MATCH_THRESHOLD_MS, TIMINGS } from '../../config/timings';
import { shouldCompleteChallenge } from '../../domain/challenge';
import { createNoteFromMidi } from '../../domain/note';
import { createInitialQueue, DEFAULT_QUEUE_SIZE, advanceQueue } from '../../domain/queue';
import { computeScore, updateSessionStats } from '../../domain/scoring';
import { usePracticeStore } from '../../store/practiceStore';
import { Note } from '../../types';

import type { PracticeActions, PracticeRefs, PracticeStoreState, PressedKeys } from './slices';

export const useDetectedNoteUpdater = (setDetectedNote: PracticeActions['setDetectedNote']) =>
  useCallback(
    (note: Note | null) => {
      const prev = usePracticeStore.getState().detectedNote;
      if (!note && !prev) return;
      if (!note || !prev) {
        setDetectedNote(note);
        return;
      }
      if (note.midi === prev.midi) return;
      setDetectedNote(note);
    },
    [setDetectedNote]
  );

const lockProcessing = (isProcessingRef: PracticeRefs['isProcessingRef']) => {
  isProcessingRef.current = true;
  setTimeout(() => {
    isProcessingRef.current = false;
  }, TIMINGS.PROCESSING_LOCKOUT_MS);
};

const enqueueExitAnimation = (
  currentNote: Note,
  exitingNotes: Note[],
  setExitingNotes: PracticeActions['setExitingNotes']
) => {
  setExitingNotes([...exitingNotes, currentNote]);
  setTimeout(() => {
    const latest = usePracticeStore.getState().exitingNotes;
    setExitingNotes(latest.filter((note) => note.id !== currentNote.id));
  }, TIMINGS.EXIT_ANIMATION_CLEANUP_MS);
};

const updateScoreAndStats = ({
  state,
  lastHitTime,
  hasMistakeForCurrent,
  setScore,
  setStreak,
  setSessionStats,
}: {
  state: PracticeStoreState;
  lastHitTime: PracticeRefs['lastHitTime'];
  hasMistakeForCurrent: PracticeRefs['hasMistakeForCurrent'];
  setScore: PracticeActions['setScore'];
  setStreak: PracticeActions['setStreak'];
  setSessionStats: PracticeActions['setSessionStats'];
}) => {
  setScore(computeScore(state.score, state.streak));
  setStreak(state.streak + 1);

  const now = Date.now();
  const timeDiff = now - lastHitTime.current;
  lastHitTime.current = now;
  setSessionStats(
    updateSessionStats({
      prev: state.sessionStats,
      hasMistake: hasMistakeForCurrent.current,
      timeDiffMs: timeDiff,
    })
  );
};

const handleChallengeProgress = ({
  state,
  nextChallengeIndex,
  setChallengeIndex,
  setChallengeSequence,
  setChallengeInfo,
  setNoteQueue,
  onChallengeComplete,
}: {
  state: PracticeStoreState;
  nextChallengeIndex: number;
  setChallengeIndex: PracticeActions['setChallengeIndex'];
  setChallengeSequence: PracticeActions['setChallengeSequence'];
  setChallengeInfo: PracticeActions['setChallengeInfo'];
  setNoteQueue: PracticeActions['setNoteQueue'];
  onChallengeComplete?: () => void;
}) => {
  if (state.challengeSequence.length === 0) return;
  setChallengeIndex(nextChallengeIndex);

  if (shouldCompleteChallenge(state.noteQueue.length, state.challengeSequence.length)) {
    onChallengeComplete?.();
    setTimeout(() => {
      setChallengeSequence([]);
      setChallengeInfo(null);
      setNoteQueue(
        createInitialQueue(
          state.clef,
          DEFAULT_QUEUE_SIZE,
          state.practiceRange,
          false,
          state.handMode
        )
      );
    }, TIMINGS.CHALLENGE_COMPLETE_DELAY_MS);
  }
};

export const useHandleCorrectNote = (
  actions: PracticeActions,
  refs: PracticeRefs,
  onChallengeComplete?: () => void
) => {
  const {
    setExitingNotes,
    setNoteQueue,
    setScore,
    setStreak,
    setSessionStats,
    setChallengeIndex,
    setChallengeSequence,
    setChallengeInfo,
  } = actions;
  const { lastHitTime, hasMistakeForCurrent, isProcessingRef } = refs;

  return useCallback(() => {
    if (isProcessingRef.current) return;

    const state = usePracticeStore.getState();
    const currentNote = state.noteQueue[0];
    if (!currentNote) return;

    lockProcessing(isProcessingRef);

    // For both-hands mode, animate both notes exiting
    if (state.handMode === 'both-hands') {
      const secondNote = state.noteQueue[1];
      if (secondNote) {
        enqueueExitAnimation(currentNote, state.exitingNotes, setExitingNotes);
        enqueueExitAnimation(secondNote, state.exitingNotes, setExitingNotes);
      }
    } else {
      enqueueExitAnimation(currentNote, state.exitingNotes, setExitingNotes);
    }

    updateScoreAndStats({
      state,
      lastHitTime,
      hasMistakeForCurrent,
      setScore,
      setStreak,
      setSessionStats,
    });

    const { nextQueue, nextChallengeIndex } = advanceQueue({
      queue: state.noteQueue,
      clef: state.clef,
      challengeSequence: state.challengeSequence,
      challengeIndex: state.challengeIndex,
      practiceRange: state.practiceRange,
      queueSize: DEFAULT_QUEUE_SIZE,
      handMode: state.handMode,
    });

    setNoteQueue(nextQueue);
    handleChallengeProgress({
      state,
      nextChallengeIndex,
      setChallengeIndex,
      setChallengeSequence,
      setChallengeInfo,
      setNoteQueue,
      onChallengeComplete,
    });

    hasMistakeForCurrent.current = false;
  }, [
    hasMistakeForCurrent,
    isProcessingRef,
    lastHitTime,
    onChallengeComplete,
    setChallengeIndex,
    setChallengeInfo,
    setChallengeSequence,
    setExitingNotes,
    setNoteQueue,
    setScore,
    setSessionStats,
    setStreak,
  ]);
};

export const useMicNoteHandler = (
  updateDetectedNote: (note: Note | null) => void,
  handleCorrectNote: () => void,
  refs: PracticeRefs
) => {
  const { matchTimer, wrongTimer, hasMistakeForCurrent, isProcessingRef } = refs;

  return useCallback(
    (note: Note | null) => {
      const state = usePracticeStore.getState();
      if (!state.isListening) return;

      updateDetectedNote(note);

      const target = state.noteQueue[0];
      if (!target || isProcessingRef.current) return;

      if (note) {
        if (note.midi === target.midi) {
          wrongTimer.current = 0;
          const now = Date.now();
          if (matchTimer.current === 0) matchTimer.current = now;
          if (now - matchTimer.current > MATCH_THRESHOLD_MS) {
            handleCorrectNote();
            matchTimer.current = 0;
          }
        } else {
          matchTimer.current = 0;
          const now = Date.now();
          if (wrongTimer.current === 0) wrongTimer.current = now;
          if (now - wrongTimer.current > MATCH_THRESHOLD_MS) {
            hasMistakeForCurrent.current = true;
            wrongTimer.current = 0;
          }
        }
      } else {
        matchTimer.current = 0;
        wrongTimer.current = 0;
      }
    },
    [
      handleCorrectNote,
      hasMistakeForCurrent,
      isProcessingRef,
      matchTimer,
      updateDetectedNote,
      wrongTimer,
    ]
  );
};

// Helper: check if both hands are correctly pressed
const checkBothHandsCorrect = (
  rightTarget: Note | undefined,
  leftTarget: Note | undefined,
  pressedKeys: PressedKeys
): boolean => {
  if (!rightTarget || !leftTarget) return false;
  const rightPressed = pressedKeys.has(rightTarget.midi);
  const leftPressed = pressedKeys.has(leftTarget.midi);
  if (!rightPressed && !leftPressed) return false;

  const currentPressed = Array.from(pressedKeys.values());
  const rightIsCorrect = currentPressed.some(
    (p) => p.note.midi === rightTarget.midi && p.isCorrect
  );
  const leftIsCorrect = currentPressed.some((p) => p.note.midi === leftTarget.midi && p.isCorrect);
  return rightIsCorrect && leftIsCorrect;
};

export const useMidiNoteHandlers = (
  setDetectedNote: PracticeActions['setDetectedNote'],
  addPressedKey: (
    midiNumber: number,
    note: Note,
    isCorrect: boolean,
    targetId?: string | null
  ) => void,
  removePressedKey: (
    midiNumber: number
  ) => { note: Note; isCorrect: boolean; targetId?: string | null } | null,
  pressedKeysRef: MutableRefObject<PressedKeys>,
  handleCorrectNote: () => void,
  refs: PracticeRefs
) => {
  const { hasMistakeForCurrent, isProcessingRef } = refs;

  const handleMidiNoteOn = useCallback(
    (midiNumber: number) => {
      const note = createNoteFromMidi(midiNumber, -1);
      setDetectedNote(note);

      const state = usePracticeStore.getState();
      const handMode = state.handMode;

      if (handMode === 'both-hands') {
        const rightTarget = state.noteQueue[0];
        const leftTarget = state.noteQueue[1];
        const matchesRight = rightTarget && midiNumber === rightTarget.midi;
        const matchesLeft = leftTarget && midiNumber === leftTarget.midi;
        const isCorrect = matchesRight || matchesLeft;
        const targetId = matchesRight ? rightTarget.id : matchesLeft ? leftTarget.id : null;

        addPressedKey(midiNumber, note, isCorrect, targetId);
        if (!isCorrect) hasMistakeForCurrent.current = true;
      } else {
        const target = state.noteQueue[0];
        const isCorrect = target ? midiNumber === target.midi : false;
        addPressedKey(midiNumber, note, isCorrect, target?.id ?? null);
        if (target && !isCorrect) hasMistakeForCurrent.current = true;
      }
    },
    [addPressedKey, hasMistakeForCurrent, setDetectedNote]
  );

  const handleMidiNoteOff = useCallback(
    (midiNumber: number) => {
      const pressedInfo = removePressedKey(midiNumber);
      const values = Array.from(pressedKeysRef.current.values());
      const lastPressed = values.length > 0 ? values[values.length - 1].note : null;
      setDetectedNote(lastPressed);

      if (pressedInfo?.isCorrect && !isProcessingRef.current) {
        const state = usePracticeStore.getState();
        const handMode = state.handMode;

        if (handMode === 'both-hands') {
          const rightTarget = state.noteQueue[0];
          const leftTarget = state.noteQueue[1];
          if (checkBothHandsCorrect(rightTarget, leftTarget, pressedKeysRef.current)) {
            handleCorrectNote();
          }
        } else {
          const target = state.noteQueue[0];
          const isSameTarget = !pressedInfo.targetId || target?.id === pressedInfo.targetId;
          if (isSameTarget && target && target.midi === midiNumber) {
            handleCorrectNote();
          }
        }
      }
    },
    [handleCorrectNote, isProcessingRef, pressedKeysRef, removePressedKey, setDetectedNote]
  );

  return { handleMidiNoteOn, handleMidiNoteOff };
};
