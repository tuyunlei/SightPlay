import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PracticeEffect } from '../../../domain/practiceCore';
import { ClefType } from '../../../types';
import { UseAudioInputDependencies } from '../../useAudioInput';
import {
  useLoadChallenge,
  useMicInput,
  useQueueInitialization,
  useResetSessionStats,
  useToggleClef,
  useToggleMic,
} from '../actions';

describe('useLoadChallenge', () => {
  it('dispatches one atomic challenge action and resets the session clock', () => {
    const dispatch = vi.fn((): PracticeEffect[] => []);
    const lastHitTime = { current: 0 };
    const { result } = renderHook(() => useLoadChallenge(dispatch, lastHitTime, () => 42));

    let count = 0;
    act(() => {
      count = result.current({
        title: 'C major',
        notes: ['C4', 'E4', 'G4'],
        description: 'triad',
      });
    });

    expect(count).toBe(3);
    expect(lastHitTime.current).toBe(42);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'challengeLoaded',
      challenge: expect.objectContaining({ title: 'C major' }),
      challengeSequence: expect.arrayContaining([
        expect.objectContaining({ midi: 60 }),
        expect.objectContaining({ midi: 64 }),
        expect.objectContaining({ midi: 67 }),
      ]),
      noteQueue: expect.arrayContaining([expect.objectContaining({ midi: 60 })]),
    });
  });

  it('rejects a challenge with no valid notes without changing state', () => {
    const dispatch = vi.fn((): PracticeEffect[] => []);
    const lastHitTime = { current: 11 };
    const { result } = renderHook(() => useLoadChallenge(dispatch, lastHitTime, () => 42));

    const count = result.current({ title: 'Bad', notes: ['invalid'], description: 'bad' });

    expect(count).toBe(0);
    expect(dispatch).not.toHaveBeenCalled();
    expect(lastHitTime.current).toBe(11);
  });
});

describe('simple practice commands', () => {
  it('toggles microphone according to current listening state', () => {
    const start = vi.fn();
    const stop = vi.fn();

    useToggleMic(false, start, stop)();
    useToggleMic(true, start, stop)();

    expect(start).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('toggles between treble and bass', () => {
    const setClef = vi.fn();
    useToggleClef(ClefType.TREBLE, setClef)();
    useToggleClef(ClefType.BASS, setClef)();

    expect(setClef).toHaveBeenNthCalledWith(1, ClefType.BASS);
    expect(setClef).toHaveBeenNthCalledWith(2, ClefType.TREBLE);
  });

  it('resets statistics and records the new hit-time origin', () => {
    const reset = vi.fn();
    const lastHitTime = { current: 0 };
    const now = vi.spyOn(Date, 'now').mockReturnValue(91);

    useResetSessionStats(reset, lastHitTime)();

    expect(reset).toHaveBeenCalledOnce();
    expect(lastHitTime.current).toBe(91);
    now.mockRestore();
  });
});

describe('useMicInput', () => {
  it('translates injected audio lifecycle into practice state callbacks', async () => {
    const processor = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      getPitch: vi.fn().mockReturnValue(null),
    };
    const dependencies: UseAudioInputDependencies = {
      createProcessor: () => processor,
      requestFrame: vi.fn(() => 1),
      cancelFrame: vi.fn(),
    };
    const setIsListening = vi.fn();
    const setStatus = vi.fn();
    const setDetectedNote = vi.fn();
    const { result } = renderHook(() =>
      useMicInput(vi.fn(), setIsListening, setStatus, setDetectedNote, vi.fn(), dependencies)
    );

    await act(() => result.current.start());
    act(() => result.current.stop());

    expect(setIsListening.mock.calls).toEqual([[true], [false]]);
    expect(setStatus.mock.calls).toEqual([['listening'], ['waiting']]);
    expect(setDetectedNote).toHaveBeenCalledWith(null);
  });
});

describe('useQueueInitialization', () => {
  it('initializes a playable queue and records the hit-time origin', () => {
    const setNoteQueue = vi.fn();
    const lastHitTime = { current: 0 };

    renderHook(() =>
      useQueueInitialization({
        clef: ClefType.TREBLE,
        practiceRange: 'combined',
        handMode: 'right-hand',
        challengeSequenceLength: 0,
        setNoteQueue,
        lastHitTime,
      })
    );

    expect(setNoteQueue.mock.calls[0][0].length).toBeGreaterThan(0);
    expect(lastHitTime.current).toBeGreaterThan(0);
  });

  it('does not add a second challenge-reset initialization when a challenge is active', () => {
    const setNoteQueue = vi.fn();
    const lastHitTime = { current: 0 };
    const { rerender } = renderHook(
      ({ clef }) =>
        useQueueInitialization({
          clef,
          practiceRange: 'combined',
          handMode: 'right-hand',
          challengeSequenceLength: 5,
          setNoteQueue,
          lastHitTime,
        }),
      { initialProps: { clef: ClefType.TREBLE } }
    );
    const before = setNoteQueue.mock.calls.length;

    rerender({ clef: ClefType.BASS });

    expect(setNoteQueue.mock.calls.length - before).toBe(1);
  });
});
