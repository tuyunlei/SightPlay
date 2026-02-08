import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useLoadChallenge } from '../actions';

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
