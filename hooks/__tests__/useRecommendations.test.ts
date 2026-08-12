import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { usePracticeStore } from '../../store/practiceStore';
import { ClefType } from '../../types';
import { useRecommendations } from '../useRecommendations';

describe('useRecommendations', () => {
  beforeEach(() => {
    usePracticeStore.setState({
      clef: ClefType.TREBLE,
      practiceRange: 'central',
      practiceMode: 'random',
      sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
    });
  });

  it('returns no recommendations when there are not enough random attempts', () => {
    usePracticeStore.setState({
      sessionStats: { totalAttempts: 19, cleanHits: 19, bpm: 80 },
    });

    const { result } = renderHook(() => useRecommendations());

    expect(result.current.recommendations).toEqual([]);
  });

  it('selects the exact target for a high-accuracy random practice recommendation', () => {
    usePracticeStore.setState({
      sessionStats: { totalAttempts: 30, cleanHits: 29, bpm: 90 },
      clef: ClefType.TREBLE,
      practiceRange: 'central',
      practiceMode: 'random',
    });

    const { result } = renderHook(() => useRecommendations());

    expect(result.current.recommendations.length).toBeGreaterThan(0);

    const clefRec = result.current.recommendations.find((r) => r.action?.kind === 'setClef');
    expect(clefRec).toBeDefined();
    if (!clefRec) {
      throw new Error('Expected clef recommendation to exist');
    }

    expect(clefRec.action).toEqual({ kind: 'setClef', clef: ClefType.BASS });
  });

  it('handles song completion flow and reset', () => {
    usePracticeStore.setState({
      practiceMode: 'song',
      sessionStats: { totalAttempts: 10, cleanHits: 8, bpm: 70 },
    });

    const { result } = renderHook(() => useRecommendations());

    act(() => {
      result.current.onSongComplete('beginner');
    });

    expect(result.current.recommendations.length).toBeGreaterThan(0);
    expect(result.current.recommendations.some((r) => r.type === 'song')).toBe(true);

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.recommendations).toEqual([]);

    act(() => {
      result.current.reset();
    });
    expect(result.current.recommendations).toEqual([]);
  });
});
