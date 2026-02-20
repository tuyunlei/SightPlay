import { DEFAULT_QUEUE_SIZE, advanceQueue } from '../../../domain/queue';
import { usePracticeStore } from '../../../store/practiceStore';
import type { PracticeActions, PracticeRefs } from '../slices';

import { enqueueExitAnimation, lockProcessing } from './animations';
import { handleChallengeProgress, updateScoreAndStats } from './scoring';

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

  return () => {
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
  };
};
