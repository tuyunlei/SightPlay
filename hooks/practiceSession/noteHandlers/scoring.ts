import { TIMINGS } from '../../../config/timings';
import { shouldCompleteChallenge } from '../../../domain/challenge';
import { createInitialQueue, DEFAULT_QUEUE_SIZE } from '../../../domain/queue';
import { computeScore, updateSessionStats } from '../../../domain/scoring';
import type { PracticeActions, PracticeRefs, PracticeStoreState } from '../slices';

export const updateScoreAndStats = ({
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

export const handleChallengeProgress = ({
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
