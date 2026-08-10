import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNoteFromMidi } from '../../../domain/note';
import { initialPracticeState } from '../../../domain/practiceCore';
import { usePracticeStore } from '../../../store/practiceStore';
import { useHandleCorrectNote } from '../noteHandlers';
import { PracticeRuntime } from '../runtime';
import { usePracticeActionsSlice } from '../slices';
import type { PracticeRefs } from '../slices';

describe('useHandleCorrectNote effects', () => {
  let scheduled: Array<{ delayMs: number; task: () => void; cancel: ReturnType<typeof vi.fn> }>;
  let runtime: PracticeRuntime;
  let refs: PracticeRefs;

  beforeEach(() => {
    usePracticeStore.setState(initialPracticeState);
    scheduled = [];
    runtime = {
      now: () => 2_000,
      schedule: (delayMs, task) => {
        const cancel = vi.fn();
        scheduled.push({ delayMs, task, cancel });
        return cancel;
      },
    };
    refs = {
      matchTimer: { current: 0 },
      wrongTimer: { current: 0 },
      lastHitTime: { current: 1_000 },
      hasMistakeForCurrent: { current: false },
      isProcessingRef: { current: false },
    };
  });

  it('runs reducer effects through the injected scheduler', () => {
    const target = createNoteFromMidi(60, 0);
    const challenge = [target];
    usePracticeStore.setState({
      noteQueue: [target],
      challengeSequence: challenge,
      challengeIndex: 0,
      challengeInfo: { title: 'One note', notes: ['C4'], description: 'test' },
    });
    const onComplete = vi.fn();
    const { result, unmount } = renderHook(() => {
      const actions = usePracticeActionsSlice();
      return useHandleCorrectNote(actions, refs, onComplete, runtime);
    });

    act(() => result.current());

    expect(onComplete).toHaveBeenCalledOnce();
    expect(usePracticeStore.getState()).toMatchObject({ score: 10, streak: 1 });
    expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([150, 600, 1500]);

    act(() => scheduled.find(({ delayMs }) => delayMs === 600)?.task());
    expect(usePracticeStore.getState().exitingNotes).toEqual([]);

    act(() => scheduled.find(({ delayMs }) => delayMs === 1500)?.task());
    expect(usePracticeStore.getState().challengeSequence).toEqual([]);
    expect(usePracticeStore.getState().noteQueue.length).toBeGreaterThan(0);

    unmount();
    expect(scheduled.find(({ delayMs }) => delayMs === 150)?.cancel).toHaveBeenCalledOnce();
    expect(scheduled.find(({ delayMs }) => delayMs === 600)?.cancel).not.toHaveBeenCalled();
    expect(scheduled.find(({ delayMs }) => delayMs === 1500)?.cancel).not.toHaveBeenCalled();
  });
});
