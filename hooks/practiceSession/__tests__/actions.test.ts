import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createNoteFromMidi } from '../../../domain/note';
import { ClefType } from '../../../types';
import { useToggleClef, useToggleMic, useResetSessionStats, useLoadChallenge } from '../actions';

describe('useToggleClef', () => {
  it('toggles from treble to bass', () => {
    const setClef = vi.fn();
    const { result } = renderHook(() => useToggleClef(ClefType.TREBLE, setClef));
    act(() => result.current());
    expect(setClef).toHaveBeenCalledWith(ClefType.BASS);
  });

  it('toggles from bass to treble', () => {
    const setClef = vi.fn();
    const { result } = renderHook(() => useToggleClef(ClefType.BASS, setClef));
    act(() => result.current());
    expect(setClef).toHaveBeenCalledWith(ClefType.TREBLE);
  });
});

describe('useToggleMic', () => {
  it('calls stopMic when listening', () => {
    const start = vi.fn();
    const stop = vi.fn();
    const { result } = renderHook(() => useToggleMic(true, start, stop));
    act(() => result.current());
    expect(stop).toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });

  it('calls startMic when not listening', () => {
    const start = vi.fn();
    const stop = vi.fn();
    const { result } = renderHook(() => useToggleMic(false, start, stop));
    act(() => result.current());
    expect(start).toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
  });
});

describe('useResetSessionStats', () => {
  it('resets stats and updates lastHitTime', () => {
    const resetStats = vi.fn();
    const lastHitTime = { current: 0 };
    const { result } = renderHook(() => useResetSessionStats(resetStats, lastHitTime));

    const before = Date.now();
    act(() => result.current());

    expect(resetStats).toHaveBeenCalled();
    expect(lastHitTime.current).toBeGreaterThanOrEqual(before);
  });
});

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
