import { useRef, useState, useCallback } from 'react';
import type { MutableRefObject } from 'react';

import { usePracticeStore } from '../../store/practiceStore';
import { Note } from '../../types';

export interface UsePracticeSessionOptions {
  onMicError: () => void;
  onChallengeComplete?: () => void;
}

export type PressedKeys = Map<number, { note: Note; isCorrect: boolean; targetId?: string | null }>;

export type PracticeRefs = {
  matchTimer: MutableRefObject<number>;
  wrongTimer: MutableRefObject<number>;
  lastHitTime: MutableRefObject<number>;
  hasMistakeForCurrent: MutableRefObject<boolean>;
  isProcessingRef: MutableRefObject<boolean>;
};

export const usePracticeStateSlice = () => {
  const clef = usePracticeStore((state) => state.clef);
  const practiceRange = usePracticeStore((state) => state.practiceRange);
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
    practiceRange,
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

export const usePracticeActionsSlice = () => {
  const setClef = usePracticeStore((state) => state.setClef);
  const setIsListening = usePracticeStore((state) => state.setIsListening);
  const setIsMidiConnected = usePracticeStore((state) => state.setIsMidiConnected);
  const setPracticeRange = usePracticeStore((state) => state.setPracticeRange);
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
    setPracticeRange,
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

export type PracticeActions = ReturnType<typeof usePracticeActionsSlice>;
export type PracticeStoreState = ReturnType<typeof usePracticeStore.getState>;

export const usePracticeRefs = (): PracticeRefs => ({
  matchTimer: useRef(0),
  wrongTimer: useRef(0),
  lastHitTime: useRef(0),
  hasMistakeForCurrent: useRef(false),
  isProcessingRef: useRef(false),
});

export const usePressedKeysState = () => {
  const pressedKeysRef = useRef<PressedKeys>(new Map());
  const [pressedKeys, setPressedKeys] = useState<PressedKeys>(pressedKeysRef.current);

  const setPressedKeysValue = useCallback((next: PressedKeys) => {
    pressedKeysRef.current = next;
    setPressedKeys(next);
  }, []);

  const addPressedKey = useCallback(
    (midiNumber: number, note: Note, isCorrect: boolean, targetId?: string | null) => {
      const next = new Map(pressedKeysRef.current);
      next.set(midiNumber, { note, isCorrect, targetId });
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
