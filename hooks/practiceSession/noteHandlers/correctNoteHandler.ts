import { useEffect, useRef } from 'react';

import { TIMINGS } from '../../../config/timings';
import { createInitialQueue, DEFAULT_QUEUE_SIZE, advanceQueue } from '../../../domain/queue';
import { usePracticeStore } from '../../../store/practiceStore';
import { browserPracticeRuntime, PracticeRuntime } from '../runtime';
import type { PracticeActions, PracticeRefs } from '../slices';

const unlockProcessing = (ref: PracticeRefs['isProcessingRef']) => {
  ref.current = false;
};

const lockProcessing = (ref: PracticeRefs['isProcessingRef']) => {
  ref.current = true;
};

const resetAcceptedNoteRefs = (
  lastHitTime: PracticeRefs['lastHitTime'],
  hasMistakeForCurrent: PracticeRefs['hasMistakeForCurrent'],
  acceptedAt: number
) => {
  lastHitTime.current = acceptedAt;
  hasMistakeForCurrent.current = false;
};

export const useHandleCorrectNote = (
  actions: PracticeActions,
  refs: PracticeRefs,
  onChallengeComplete?: () => void,
  runtime: PracticeRuntime = browserPracticeRuntime
) => {
  const { dispatch } = actions;
  const { lastHitTime, hasMistakeForCurrent, isProcessingRef } = refs;
  const cancellations = useRef(new Set<() => void>());

  useEffect(
    () => () => {
      for (const cancel of cancellations.current) cancel();
      cancellations.current.clear();
    },
    []
  );

  const schedule = (delayMs: number, task: () => void) => {
    let cancel = () => {};
    cancel = runtime.schedule(delayMs, () => {
      cancellations.current.delete(cancel);
      task();
    });
    cancellations.current.add(cancel);
  };

  return () => {
    if (isProcessingRef.current) return;

    const state = usePracticeStore.getState();
    if (!state.noteQueue[0]) return;

    lockProcessing(isProcessingRef);
    schedule(TIMINGS.PROCESSING_LOCKOUT_MS, () => {
      unlockProcessing(isProcessingRef);
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
    const acceptedAt = runtime.now();
    const effects = dispatch({
      type: 'correctNoteAccepted',
      acceptedAt,
      previousHitAt: lastHitTime.current,
      hadMistake: hasMistakeForCurrent.current,
      nextQueue,
      nextChallengeIndex,
    });

    resetAcceptedNoteRefs(lastHitTime, hasMistakeForCurrent, acceptedAt);

    for (const effect of effects) {
      if (effect.type === 'scheduleExitCleanup') {
        schedule(effect.delayMs, () => {
          dispatch({ type: 'exitAnimationElapsed', noteId: effect.noteId });
        });
        continue;
      }

      onChallengeComplete?.();
      schedule(effect.delayMs, () => {
        dispatch({
          type: 'challengeResetElapsed',
          noteQueue: createInitialQueue(
            effect.clef,
            DEFAULT_QUEUE_SIZE,
            effect.practiceRange,
            false,
            effect.handMode
          ),
        });
      });
    }
  };
};
