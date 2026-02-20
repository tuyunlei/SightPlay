import { useCallback, useEffect } from 'react';

import { buildChallengeNotes } from '../../domain/challenge';
import { createInitialQueue, createChallengeQueue, DEFAULT_QUEUE_SIZE } from '../../domain/queue';
import { ClefType, GeneratedChallenge, HandPracticeMode, Note } from '../../types';
import { useAudioInput } from '../useAudioInput';

import type { PracticeActions, PracticeRefs, PracticeStoreState } from './slices';

export const useQueueInitialization = ({
  clef,
  practiceRange,
  handMode,
  challengeSequenceLength,
  setNoteQueue,
  lastHitTime,
}: {
  clef: ClefType;
  practiceRange: PracticeStoreState['practiceRange'];
  handMode: HandPracticeMode;
  challengeSequenceLength: number;
  setNoteQueue: PracticeActions['setNoteQueue'];
  lastHitTime: PracticeRefs['lastHitTime'];
}) => {
  // Kept: stable identity required for useEffect dependency behavior.
  const initializeQueue = useCallback(
    (overrideClef?: ClefType, overrideHandMode?: HandPracticeMode) => {
      const nextQueue = createInitialQueue(
        overrideClef ?? clef,
        DEFAULT_QUEUE_SIZE,
        practiceRange,
        false,
        overrideHandMode ?? handMode
      );
      setNoteQueue(nextQueue);
    },
    [clef, practiceRange, handMode, setNoteQueue]
  );

  useEffect(() => {
    initializeQueue();
    lastHitTime.current = Date.now();
  }, [initializeQueue, lastHitTime]);

  useEffect(() => {
    if (challengeSequenceLength === 0) {
      initializeQueue(clef, handMode);
    }
  }, [challengeSequenceLength, clef, handMode, initializeQueue]);
};

export const useToggleMic = (isListening: boolean, startMic: () => void, stopMic: () => void) => {
  return () => {
    if (isListening) {
      stopMic();
    } else {
      startMic();
    }
  };
};

export const useToggleClef = (clef: ClefType, setClef: PracticeActions['setClef']) => {
  return () => {
    const nextClef = clef === ClefType.TREBLE ? ClefType.BASS : ClefType.TREBLE;
    setClef(nextClef);
  };
};

export const useResetSessionStats = (
  resetStats: PracticeActions['resetStats'],
  lastHitTime: PracticeRefs['lastHitTime']
) => {
  return () => {
    resetStats();
    lastHitTime.current = Date.now();
  };
};

export const useLoadChallenge =
  (
    resetSessionStats: () => void,
    setChallengeInfo: PracticeActions['setChallengeInfo'],
    setChallengeSequence: PracticeActions['setChallengeSequence'],
    setChallengeIndex: PracticeActions['setChallengeIndex'],
    setNoteQueue: PracticeActions['setNoteQueue']
  ) =>
  (challenge: GeneratedChallenge) => {
    const notes = buildChallengeNotes(challenge.notes);
    if (notes.length === 0) return 0;

    setChallengeInfo(challenge);
    setChallengeSequence(notes);
    setChallengeIndex(0);

    setNoteQueue(createChallengeQueue(notes, DEFAULT_QUEUE_SIZE));
    resetSessionStats();

    return notes.length;
  };

export const useMicInput = (
  handleMicNote: (note: Note | null) => void,
  setIsListening: PracticeActions['setIsListening'],
  setStatus: PracticeActions['setStatus'],
  setDetectedNote: PracticeActions['setDetectedNote'],
  onMicError: () => void
) => {
  const handleStart = () => {
    setIsListening(true);
    setStatus('listening');
  };

  const handleStop = () => {
    setIsListening(false);
    setStatus('waiting');
    setDetectedNote(null);
  };

  const handleError = () => {
    onMicError();
  };

  return useAudioInput({
    onNoteDetected: handleMicNote,
    onStart: handleStart,
    onStop: handleStop,
    onError: handleError,
  });
};
