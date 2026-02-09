import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  useLoadChallenge,
  useToggleMic,
  useToggleClef,
  useResetSessionStats,
  useMicInput,
  useQueueInitialization,
} from '../actions';
import { ClefType } from '../../../types';

describe('useLoadChallenge', () => {
  it('loads challenge notes and returns count', () => {
    const resetStats = vi.fn();
    const setChallengeInfo = vi.fn();
    const setChallengeSequence = vi.fn();
    const setChallengeIndex = vi.fn();
    const setNoteQueue = vi.fn();

    const { result } = renderHook(() =>
      useLoadChallenge(resetStats, setChallengeInfo, setChallengeSequence, setChallengeIndex, setNoteQueue)
    );

    let count: number;
    act(() => {
      count = result.current({
        title: 'Test',
        notes: ['C4', 'E4', 'G4'],
        description: 'test challenge',
      });
    });

    expect(count!).toBe(3);
    expect(setChallengeInfo).toHaveBeenCalled();
    expect(setChallengeSequence).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ midi: 60 }),
      expect.objectContaining({ midi: 64 }),
      expect.objectContaining({ midi: 67 }),
    ]));
    expect(setChallengeIndex).toHaveBeenCalledWith(0);
    expect(setNoteQueue).toHaveBeenCalled();
    expect(resetStats).toHaveBeenCalled();
  });

  it('returns 0 for invalid notes', () => {
    const resetStats = vi.fn();
    const setChallengeInfo = vi.fn();
    const setChallengeSequence = vi.fn();
    const setChallengeIndex = vi.fn();
    const setNoteQueue = vi.fn();

    const { result } = renderHook(() =>
      useLoadChallenge(resetStats, setChallengeInfo, setChallengeSequence, setChallengeIndex, setNoteQueue)
    );

    let count: number;
    act(() => {
      count = result.current({
        title: 'Test',
        notes: ['invalid', 'XYZ'],
        description: 'bad notes',
      });
    });

    expect(count!).toBe(0);
    expect(setChallengeSequence).not.toHaveBeenCalled();
  });
});

describe('useToggleMic', () => {
  it('calls stopMic when currently listening', () => {
    const startMic = vi.fn();
    const stopMic = vi.fn();

    const { result } = renderHook(() => useToggleMic(true, startMic, stopMic));

    act(() => {
      result.current();
    });

    expect(stopMic).toHaveBeenCalled();
    expect(startMic).not.toHaveBeenCalled();
  });

  it('calls startMic when not listening', () => {
    const startMic = vi.fn();
    const stopMic = vi.fn();

    const { result } = renderHook(() => useToggleMic(false, startMic, stopMic));

    act(() => {
      result.current();
    });

    expect(startMic).toHaveBeenCalled();
    expect(stopMic).not.toHaveBeenCalled();
  });
});

describe('useToggleClef', () => {
  it('toggles from treble to bass', () => {
    const setClef = vi.fn();
    const { result } = renderHook(() => useToggleClef(ClefType.TREBLE, setClef));

    act(() => {
      result.current();
    });

    expect(setClef).toHaveBeenCalledWith(ClefType.BASS);
  });

  it('toggles from bass to treble', () => {
    const setClef = vi.fn();
    const { result } = renderHook(() => useToggleClef(ClefType.BASS, setClef));

    act(() => {
      result.current();
    });

    expect(setClef).toHaveBeenCalledWith(ClefType.TREBLE);
  });
});

describe('useResetSessionStats', () => {
  it('resets stats and updates lastHitTime', () => {
    const resetStats = vi.fn();
    const lastHitTime = { current: 0 };

    const { result } = renderHook(() => useResetSessionStats(resetStats, lastHitTime));

    const before = Date.now();
    act(() => {
      result.current();
    });

    expect(resetStats).toHaveBeenCalled();
    expect(lastHitTime.current).toBeGreaterThanOrEqual(before);
  });
});

describe('useMicInput', () => {
  it('wires up audio input callbacks correctly', () => {
    const handleMicNote = vi.fn();
    const setIsListening = vi.fn();
    const setStatus = vi.fn();
    const setDetectedNote = vi.fn();
    const onMicError = vi.fn();

    let capturedOpts: any;
    const mockUseAudioInput = vi.fn((opts) => {
      capturedOpts = opts;
      return { start: vi.fn(), stop: vi.fn() };
    });

    renderHook(() =>
      useMicInput(handleMicNote, setIsListening, setStatus, setDetectedNote, onMicError, mockUseAudioInput)
    );

    expect(mockUseAudioInput).toHaveBeenCalled();

    // Test onStart callback
    act(() => {
      capturedOpts.onStart();
    });
    expect(setIsListening).toHaveBeenCalledWith(true);
    expect(setStatus).toHaveBeenCalledWith('listening');

    // Test onStop callback
    act(() => {
      capturedOpts.onStop();
    });
    expect(setIsListening).toHaveBeenCalledWith(false);
    expect(setStatus).toHaveBeenCalledWith('waiting');
    expect(setDetectedNote).toHaveBeenCalledWith(null);

    // Test onError callback
    act(() => {
      capturedOpts.onError();
    });
    expect(onMicError).toHaveBeenCalled();
  });
});

describe('useQueueInitialization', () => {
  it('initializes queue on mount and sets lastHitTime', () => {
    const setNoteQueue = vi.fn();
    const lastHitTime = { current: 0 };

    renderHook(() =>
      useQueueInitialization({
        clef: ClefType.TREBLE,
        practiceRange: 'combined',
        challengeSequenceLength: 0,
        setNoteQueue,
        lastHitTime,
      })
    );

    expect(setNoteQueue).toHaveBeenCalled();
    expect(lastHitTime.current).toBeGreaterThan(0);
    // Queue should contain notes
    const queue = setNoteQueue.mock.calls[0][0];
    expect(queue.length).toBeGreaterThan(0);
  });

  it('re-initializes queue when clef changes (no challenge)', () => {
    const setNoteQueue = vi.fn();
    const lastHitTime = { current: 0 };

    const { rerender } = renderHook(
      ({ clef }) =>
        useQueueInitialization({
          clef,
          practiceRange: 'combined',
          challengeSequenceLength: 0,
          setNoteQueue,
          lastHitTime,
        }),
      { initialProps: { clef: ClefType.TREBLE } }
    );

    const initialCallCount = setNoteQueue.mock.calls.length;

    rerender({ clef: ClefType.BASS });

    expect(setNoteQueue.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('skips clef-change re-init when challenge is active (second effect is no-op)', () => {
    const setNoteQueue = vi.fn();
    const lastHitTime = { current: 0 };

    const { rerender } = renderHook(
      ({ clef }) =>
        useQueueInitialization({
          clef,
          practiceRange: 'combined',
          challengeSequenceLength: 5,
          setNoteQueue,
          lastHitTime,
        }),
      { initialProps: { clef: ClefType.TREBLE } }
    );

    const initialCallCount = setNoteQueue.mock.calls.length;

    rerender({ clef: ClefType.BASS });

    // The first effect (initializeQueue dep change) fires, but the second effect
    // (clef change guard) does NOT call initializeQueue because challengeSequenceLength > 0.
    // So we get exactly one additional call from the first effect, not two.
    const additionalCalls = setNoteQueue.mock.calls.length - initialCallCount;
    // The initializeQueue memo changes when clef changes, so the first useEffect re-runs.
    // But the second useEffect does NOT call initializeQueue.
    expect(additionalCalls).toBe(1);
  });
});
