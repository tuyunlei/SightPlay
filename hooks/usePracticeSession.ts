import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import { MATCH_THRESHOLD_MS, TIMINGS } from '../config/timings';
import { buildChallengeNotes, shouldCompleteChallenge } from '../domain/challenge';
import { createNoteFromMidi } from '../domain/note';
import {
  createInitialQueue,
  createChallengeQueue,
  DEFAULT_QUEUE_SIZE,
  advanceQueue,
} from '../domain/queue';
import { computeAccuracy, computeScore, updateSessionStats } from '../domain/scoring';
import { usePracticeStore } from '../store/practiceStore';
import { ClefType, GeneratedChallenge, Note } from '../types';

import { useAudioInput } from './useAudioInput';
import { useMidiInput } from './useMidiInput';

interface UsePracticeSessionOptions {
  onMicError: () => void;
  onChallengeComplete?: () => void;
}

type PressedKeys = Map<number, { note: Note; isCorrect: boolean }>;

type PracticeRefs = {
  matchTimer: MutableRefObject<number>;
  wrongTimer: MutableRefObject<number>;
  lastHitTime: MutableRefObject<number>;
  hasMistakeForCurrent: MutableRefObject<boolean>;
  isProcessingRef: MutableRefObject<boolean>;
};

const usePracticeStateSlice = () => {
  const clef = usePracticeStore((state) => state.clef);
  const noteQueue = usePracticeStore((state) => state.noteQueue);
  const exitingNotes = usePracticeStore((state) => state.exitingNotes);
  const detectedNote = usePracticeStore((state) => state.detectedNote);
  const status = usePracticeStore((state) => state.status);
  const score = usePracticeStore((state) => state.score);
  const streak = usePracticeStore((state) => state.streak);
  const sessionStats = usePracticeStore((state) => state.sessionStats);
  const challengeSequence = usePracticeStore((state) => state.challengeSequence);
  const challengeIndex = usePracticeStore((state) => state.challengeIndex);
  const challengeInfo = usePracticeStore((state) => state.challengeInfo);
  const isListening = usePracticeStore((state) => state.isListening);
  const isMidiConnected = usePracticeStore((state) => state.isMidiConnected);

  return {
    clef,
    noteQueue,
    exitingNotes,
    detectedNote,
    status,
    score,
    streak,
    sessionStats,
    challengeSequence,
    challengeIndex,
    challengeInfo,
    isListening,
    isMidiConnected,
  };
};

const usePracticeActionsSlice = () => {
  const setClef = usePracticeStore((state) => state.setClef);
  const setIsListening = usePracticeStore((state) => state.setIsListening);
  const setIsMidiConnected = usePracticeStore((state) => state.setIsMidiConnected);
  const setNoteQueue = usePracticeStore((state) => state.setNoteQueue);
  const setExitingNotes = usePracticeStore((state) => state.setExitingNotes);
  const setDetectedNote = usePracticeStore((state) => state.setDetectedNote);
  const setStatus = usePracticeStore((state) => state.setStatus);
  const setScore = usePracticeStore((state) => state.setScore);
  const setStreak = usePracticeStore((state) => state.setStreak);
  const setSessionStats = usePracticeStore((state) => state.setSessionStats);
  const setChallengeSequence = usePracticeStore((state) => state.setChallengeSequence);
  const setChallengeIndex = usePracticeStore((state) => state.setChallengeIndex);
  const setChallengeInfo = usePracticeStore((state) => state.setChallengeInfo);
  const resetStats = usePracticeStore((state) => state.resetStats);

  return {
    setClef,
    setIsListening,
    setIsMidiConnected,
    setNoteQueue,
    setExitingNotes,
    setDetectedNote,
    setStatus,
    setScore,
    setStreak,
    setSessionStats,
    setChallengeSequence,
    setChallengeIndex,
    setChallengeInfo,
    resetStats,
  };
};

type PracticeActions = ReturnType<typeof usePracticeActionsSlice>;
type PracticeStoreState = ReturnType<typeof usePracticeStore.getState>;

const usePracticeRefs = (): PracticeRefs => ({
  matchTimer: useRef(0),
  wrongTimer: useRef(0),
  lastHitTime: useRef(0),
  hasMistakeForCurrent: useRef(false),
  isProcessingRef: useRef(false),
});

const usePressedKeysState = () => {
  const pressedKeysRef = useRef<PressedKeys>(new Map());
  const [pressedKeys, setPressedKeys] = useState<PressedKeys>(pressedKeysRef.current);

  const setPressedKeysValue = useCallback((next: PressedKeys) => {
    pressedKeysRef.current = next;
    setPressedKeys(next);
  }, []);

  const addPressedKey = useCallback(
    (midiNumber: number, note: Note, isCorrect: boolean) => {
      const next = new Map(pressedKeysRef.current);
      next.set(midiNumber, { note, isCorrect });
      setPressedKeysValue(next);
    },
    [setPressedKeysValue]
  );

  const removePressedKey = useCallback(
    (midiNumber: number) => {
      const next = new Map(pressedKeysRef.current);
      const pressedInfo = next.get(midiNumber) ?? null;
      next.delete(midiNumber);
      setPressedKeysValue(next);
      return pressedInfo;
    },
    [setPressedKeysValue]
  );

  return {
    pressedKeys,
    pressedKeysRef,
    addPressedKey,
    removePressedKey,
  };
};

const useQueueInitialization = ({
  clef,
  challengeSequenceLength,
  setNoteQueue,
  lastHitTime,
}: {
  clef: ClefType;
  challengeSequenceLength: number;
  setNoteQueue: PracticeActions['setNoteQueue'];
  lastHitTime: PracticeRefs['lastHitTime'];
}) => {
  const initializeQueue = useCallback(
    (overrideClef?: ClefType) => {
      const nextQueue = createInitialQueue(overrideClef ?? clef, DEFAULT_QUEUE_SIZE);
      setNoteQueue(nextQueue);
    },
    [clef, setNoteQueue]
  );

  useEffect(() => {
    initializeQueue();
    lastHitTime.current = Date.now();
  }, [initializeQueue, lastHitTime]);

  useEffect(() => {
    if (challengeSequenceLength === 0) {
      initializeQueue(clef);
    }
  }, [clef, challengeSequenceLength, initializeQueue]);
};

const useDetectedNoteUpdater = (setDetectedNote: PracticeActions['setDetectedNote']) =>
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
      setNoteQueue(createInitialQueue(state.clef, DEFAULT_QUEUE_SIZE));
    }, TIMINGS.CHALLENGE_COMPLETE_DELAY_MS);
  }
};

const useHandleCorrectNote = (
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
    enqueueExitAnimation(currentNote, state.exitingNotes, setExitingNotes);
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
      queueSize: DEFAULT_QUEUE_SIZE,
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

const useMicNoteHandler = (
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

const useMidiNoteHandlers = (
  setDetectedNote: PracticeActions['setDetectedNote'],
  addPressedKey: (midiNumber: number, note: Note, isCorrect: boolean) => void,
  removePressedKey: (midiNumber: number) => { note: Note; isCorrect: boolean } | null,
  pressedKeysRef: MutableRefObject<PressedKeys>,
  handleCorrectNote: () => void,
  refs: PracticeRefs
) => {
  const { hasMistakeForCurrent, isProcessingRef } = refs;

  const handleMidiNoteOn = useCallback(
    (midiNumber: number) => {
      const note = createNoteFromMidi(midiNumber, -1);
      setDetectedNote(note);

      const target = usePracticeStore.getState().noteQueue[0];
      const isCorrect = target ? midiNumber === target.midi : false;

      addPressedKey(midiNumber, note, isCorrect);

      if (target && !isCorrect) {
        hasMistakeForCurrent.current = true;
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
        const target = usePracticeStore.getState().noteQueue[0];
        if (target && target.midi === midiNumber) {
          handleCorrectNote();
        }
      }
    },
    [handleCorrectNote, isProcessingRef, pressedKeysRef, removePressedKey, setDetectedNote]
  );

  return { handleMidiNoteOn, handleMidiNoteOff };
};

const useMicInput = (
  handleMicNote: (note: Note | null) => void,
  setIsListening: PracticeActions['setIsListening'],
  setStatus: PracticeActions['setStatus'],
  setDetectedNote: PracticeActions['setDetectedNote'],
  onMicError: () => void
) => {
  const handleStart = useCallback(() => {
    setIsListening(true);
    setStatus('listening');
  }, [setIsListening, setStatus]);

  const handleStop = useCallback(() => {
    setIsListening(false);
    setStatus('waiting');
    setDetectedNote(null);
  }, [setDetectedNote, setIsListening, setStatus]);

  const handleError = useCallback(() => {
    onMicError();
  }, [onMicError]);

  return useAudioInput({
    onNoteDetected: handleMicNote,
    onStart: handleStart,
    onStop: handleStop,
    onError: handleError,
  });
};

const useToggleMic = (isListening: boolean, startMic: () => void, stopMic: () => void) =>
  useCallback(() => {
    if (isListening) {
      stopMic();
    } else {
      startMic();
    }
  }, [isListening, startMic, stopMic]);

const useToggleClef = (clef: ClefType, setClef: PracticeActions['setClef']) =>
  useCallback(() => {
    const nextClef = clef === ClefType.TREBLE ? ClefType.BASS : ClefType.TREBLE;
    setClef(nextClef);
  }, [clef, setClef]);

const useResetSessionStats = (
  resetStats: PracticeActions['resetStats'],
  lastHitTime: PracticeRefs['lastHitTime']
) =>
  useCallback(() => {
    resetStats();
    lastHitTime.current = Date.now();
  }, [lastHitTime, resetStats]);

const useLoadChallenge = (
  resetSessionStats: () => void,
  setChallengeInfo: PracticeActions['setChallengeInfo'],
  setChallengeSequence: PracticeActions['setChallengeSequence'],
  setChallengeIndex: PracticeActions['setChallengeIndex'],
  setNoteQueue: PracticeActions['setNoteQueue']
) =>
  useCallback(
    (challenge: GeneratedChallenge) => {
      const notes = buildChallengeNotes(challenge.notes);
      if (notes.length === 0) return 0;

      setChallengeInfo(challenge);
      setChallengeSequence(notes);
      setChallengeIndex(0);

      setNoteQueue(createChallengeQueue(notes, DEFAULT_QUEUE_SIZE));
      resetSessionStats();

      return notes.length;
    },
    [resetSessionStats, setChallengeIndex, setChallengeInfo, setChallengeSequence, setNoteQueue]
  );

export const usePracticeSession = ({
  onMicError,
  onChallengeComplete,
}: UsePracticeSessionOptions) => {
  const state = usePracticeStateSlice();
  const actions = usePracticeActionsSlice();
  const refs = usePracticeRefs();
  const { pressedKeys, pressedKeysRef, addPressedKey, removePressedKey } = usePressedKeysState();

  const targetNote = state.noteQueue.length > 0 ? state.noteQueue[0] : null;
  const accuracy = useMemo(() => computeAccuracy(state.sessionStats), [state.sessionStats]);

  useQueueInitialization({
    clef: state.clef,
    challengeSequenceLength: state.challengeSequence.length,
    setNoteQueue: actions.setNoteQueue,
    lastHitTime: refs.lastHitTime,
  });

  const updateDetectedNote = useDetectedNoteUpdater(actions.setDetectedNote);
  const handleCorrectNote = useHandleCorrectNote(actions, refs, onChallengeComplete);
  const handleMicNote = useMicNoteHandler(updateDetectedNote, handleCorrectNote, refs);
  const { handleMidiNoteOn, handleMidiNoteOff } = useMidiNoteHandlers(
    actions.setDetectedNote,
    addPressedKey,
    removePressedKey,
    pressedKeysRef,
    handleCorrectNote,
    refs
  );

  useMidiInput({
    onNoteOn: handleMidiNoteOn,
    onNoteOff: handleMidiNoteOff,
    onConnectionChange: actions.setIsMidiConnected,
  });

  const { start: startMic, stop: stopMic } = useMicInput(
    handleMicNote,
    actions.setIsListening,
    actions.setStatus,
    actions.setDetectedNote,
    onMicError
  );

  const toggleMic = useToggleMic(state.isListening, startMic, stopMic);
  const toggleClef = useToggleClef(state.clef, actions.setClef);
  const resetSessionStats = useResetSessionStats(actions.resetStats, refs.lastHitTime);
  const loadChallenge = useLoadChallenge(
    resetSessionStats,
    actions.setChallengeInfo,
    actions.setChallengeSequence,
    actions.setChallengeIndex,
    actions.setNoteQueue
  );

  const sessionActions = {
    toggleMic,
    toggleClef,
    resetSessionStats,
    loadChallenge,
    setDetectedNote: actions.setDetectedNote,
    setIsListening: actions.setIsListening,
    setStatus: actions.setStatus,
    setNoteQueue: actions.setNoteQueue,
  };

  return {
    state,
    derived: { targetNote, accuracy },
    actions: sessionActions,
    pressedKeys,
  };
};
