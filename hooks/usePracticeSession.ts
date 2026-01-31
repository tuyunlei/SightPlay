import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClefType, GeneratedChallenge, Note } from '../types';
import { usePracticeStore } from '../store/practiceStore';
import { useAudioInput } from './useAudioInput';
import { useMidiInput } from './useMidiInput';
import { createNoteFromMidi } from '../domain/note';
import { createInitialQueue, createChallengeQueue, DEFAULT_QUEUE_SIZE, advanceQueue } from '../domain/queue';
import { buildChallengeNotes, shouldCompleteChallenge } from '../domain/challenge';
import { computeAccuracy, computeScore, updateSessionStats } from '../domain/scoring';
import { MATCH_THRESHOLD_MS, TIMINGS } from '../config/timings';

interface UsePracticeSessionOptions {
  onMicError: () => void;
  onChallengeComplete?: () => void;
}

export const usePracticeSession = ({ onMicError, onChallengeComplete }: UsePracticeSessionOptions) => {
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

  const setClef = usePracticeStore((state) => state.setClef);
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
  const setIsListening = usePracticeStore((state) => state.setIsListening);
  const setIsMidiConnected = usePracticeStore((state) => state.setIsMidiConnected);
  const resetStats = usePracticeStore((state) => state.resetStats);

  const [pressedKeys, setPressedKeys] = useState<Map<number, { note: Note; isCorrect: boolean }>>(new Map());

  const matchTimer = useRef<number>(0);
  const wrongTimer = useRef<number>(0);
  const lastHitTime = useRef<number>(0);
  const hasMistakeForCurrent = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);

  const targetNote = noteQueue.length > 0 ? noteQueue[0] : null;
  const accuracy = useMemo(() => computeAccuracy(sessionStats), [sessionStats]);

  const initializeQueue = useCallback((overrideClef?: ClefType) => {
    const nextQueue = createInitialQueue(overrideClef ?? clef, DEFAULT_QUEUE_SIZE);
    setNoteQueue(nextQueue);
  }, [clef, setNoteQueue]);

  useEffect(() => {
    initializeQueue();
    lastHitTime.current = Date.now();
  }, [initializeQueue]);

  useEffect(() => {
    if (challengeSequence.length === 0) {
      initializeQueue(clef);
    }
  }, [clef, challengeSequence.length, initializeQueue]);

  const updateDetectedNote = useCallback((note: Note | null) => {
    const prev = usePracticeStore.getState().detectedNote;
    if (!note && !prev) return;
    if (!note || !prev) {
      setDetectedNote(note);
      return;
    }
    if (note.midi === prev.midi) return;
    setDetectedNote(note);
  }, [setDetectedNote]);

  const handleCorrectNote = useCallback(() => {
    if (isProcessingRef.current) return;

    const state = usePracticeStore.getState();
    const currentNote = state.noteQueue[0];
    if (!currentNote) return;

    isProcessingRef.current = true;
    setTimeout(() => {
      isProcessingRef.current = false;
    }, TIMINGS.PROCESSING_LOCKOUT_MS);

    setExitingNotes([...state.exitingNotes, currentNote]);

    setTimeout(() => {
      const latest = usePracticeStore.getState().exitingNotes;
      setExitingNotes(latest.filter((note) => note.id !== currentNote.id));
    }, TIMINGS.EXIT_ANIMATION_CLEANUP_MS);

    setScore(computeScore(state.score, state.streak));
    setStreak(state.streak + 1);

    const now = Date.now();
    const timeDiff = now - lastHitTime.current;
    lastHitTime.current = now;
    setSessionStats(updateSessionStats({
      prev: state.sessionStats,
      hasMistake: hasMistakeForCurrent.current,
      timeDiffMs: timeDiff
    }));

    const { nextQueue, nextChallengeIndex } = advanceQueue({
      queue: state.noteQueue,
      clef: state.clef,
      challengeSequence: state.challengeSequence,
      challengeIndex: state.challengeIndex,
      queueSize: DEFAULT_QUEUE_SIZE
    });

    setNoteQueue(nextQueue);

    if (state.challengeSequence.length > 0) {
      setChallengeIndex(nextChallengeIndex);

      if (shouldCompleteChallenge(state.noteQueue.length, state.challengeSequence.length)) {
        onChallengeComplete?.();
        setTimeout(() => {
          setChallengeSequence([]);
          setChallengeInfo(null);
          setNoteQueue(createInitialQueue(state.clef, DEFAULT_QUEUE_SIZE));
        }, TIMINGS.CHALLENGE_COMPLETE_DELAY_MS);
      }
    }

    hasMistakeForCurrent.current = false;
  }, [onChallengeComplete, setChallengeIndex, setChallengeInfo, setChallengeSequence, setExitingNotes, setNoteQueue, setScore, setSessionStats, setStreak]);

  const handleMicNote = useCallback((note: Note | null) => {
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
  }, [handleCorrectNote, updateDetectedNote]);

  const handleMidiNoteOn = useCallback((midiNumber: number) => {
    const note = createNoteFromMidi(midiNumber, -1);
    setDetectedNote(note);

    const target = usePracticeStore.getState().noteQueue[0];
    const isCorrect = target ? midiNumber === target.midi : false;

    setPressedKeys((prev) => {
      const next = new Map(prev);
      next.set(midiNumber, { note, isCorrect });
      return next;
    });

    if (isCorrect && !isProcessingRef.current) {
      handleCorrectNote();
    } else if (target && !isCorrect) {
      hasMistakeForCurrent.current = true;
    }
  }, [handleCorrectNote, setDetectedNote]);

  const handleMidiNoteOff = useCallback((midiNumber: number) => {
    setPressedKeys((prev) => {
      const next = new Map(prev);
      next.delete(midiNumber);
      return next;
    });
  }, []);

  useMidiInput({
    onNoteOn: handleMidiNoteOn,
    onNoteOff: handleMidiNoteOff,
    onConnectionChange: setIsMidiConnected
  });

  const { start: startMic, stop: stopMic } = useAudioInput({
    onNoteDetected: handleMicNote,
    onStart: () => {
      setIsListening(true);
      setStatus('listening');
    },
    onStop: () => {
      setIsListening(false);
      setStatus('waiting');
      setDetectedNote(null);
    },
    onError: () => {
      onMicError();
    }
  });

  const toggleMic = useCallback(() => {
    if (isListening) {
      stopMic();
    } else {
      startMic();
    }
  }, [isListening, startMic, stopMic]);

  const toggleClef = useCallback(() => {
    const nextClef = clef === ClefType.TREBLE ? ClefType.BASS : ClefType.TREBLE;
    setClef(nextClef);
  }, [clef, setClef]);

  const resetSessionStats = useCallback(() => {
    resetStats();
    lastHitTime.current = Date.now();
  }, [resetStats]);

  const loadChallenge = useCallback((challenge: GeneratedChallenge) => {
    const notes = buildChallengeNotes(challenge.notes);
    if (notes.length === 0) return 0;

    setChallengeInfo(challenge);
    setChallengeSequence(notes);
    setChallengeIndex(0);

    setNoteQueue(createChallengeQueue(notes, DEFAULT_QUEUE_SIZE));
    resetSessionStats();

    return notes.length;
  }, [resetSessionStats, setChallengeIndex, setChallengeInfo, setChallengeSequence, setNoteQueue]);

  return {
    state: {
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
      isMidiConnected
    },
    derived: {
      targetNote,
      accuracy
    },
    actions: {
      toggleMic,
      toggleClef,
      resetSessionStats,
      loadChallenge,
      setDetectedNote,
      setIsListening,
      setStatus,
      setNoteQueue
    },
    pressedKeys
  };
};
