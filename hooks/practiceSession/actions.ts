import { useCallback, useEffect } from 'react';

import { buildChallengeNotes } from '../../domain/challenge';
import { createInitialQueue, createChallengeQueue, DEFAULT_QUEUE_SIZE } from '../../domain/queue';
import { ClefType, GeneratedChallenge, Note } from '../../types';

import type { PracticeActions, PracticeRefs, PracticeStoreState } from './slices';

export const useQueueInitialization = ({
  clef,
  practiceRange,
  challengeSequenceLength,
  setNoteQueue,
  lastHitTime,
}: {
  clef: ClefType;
  practiceRange: PracticeStoreState['practiceRange'];
  challengeSequenceLength: number;
  setNoteQueue: PracticeActions['setNoteQueue'];
  lastHitTime: PracticeRefs['lastHitTime'];
}) => {
  const initializeQueue = useCallback(
    (overrideClef?: ClefType) => {
      const nextQueue = createInitialQueue(overrideClef ?? clef, DEFAULT_QUEUE_SIZE, practiceRange);
      setNoteQueue(nextQueue);
    },
    [clef, practiceRange, setNoteQueue]
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

export const useToggleMic = (isListening: boolean, startMic: () => void, stopMic: () => void) =>
  useCallback(() => {
    if (isListening) {
      stopMic();
    } else {
      startMic();
    }
  }, [isListening, startMic, stopMic]);

export const useToggleClef = (clef: ClefType, setClef: PracticeActions['setClef']) =>
  useCallback(() => {
    const nextClef = clef === ClefType.TREBLE ? ClefType.BASS : ClefType.TREBLE;
    setClef(nextClef);
  }, [clef, setClef]);

export const useResetSessionStats = (
  resetStats: PracticeActions['resetStats'],
  lastHitTime: PracticeRefs['lastHitTime']
) =>
  useCallback(() => {
    resetStats();
    lastHitTime.current = Date.now();
  }, [lastHitTime, resetStats]);

export const useLoadChallenge = (
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

export const useMicInput = (
  handleMicNote: (note: Note | null) => void,
  setIsListening: PracticeActions['setIsListening'],
  setStatus: PracticeActions['setStatus'],
  setDetectedNote: PracticeActions['setDetectedNote'],
  onMicError: () => void,
  useAudioInput: (opts: {
    onNoteDetected: (note: Note | null) => void;
    onStart: () => void;
    onStop: () => void;
    onError: () => void;
  }) => { start: () => void; stop: () => void }
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
