import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('returns recommendations for high-accuracy random practice and applies action', () => {
    usePracticeStore.setState({
      sessionStats: { totalAttempts: 30, cleanHits: 29, bpm: 90 },
      clef: ClefType.TREBLE,
      practiceRange: 'central',
      practiceMode: 'random',
    });

    const toggleClef = vi.fn();
    const setPracticeRange = vi.fn();

    const { result } = renderHook(() => useRecommendations());

    expect(result.current.recommendations.length).toBeGreaterThan(0);

    const clefRec = result.current.recommendations.find((r) => r.action?.kind === 'setClef');
    expect(clefRec).toBeDefined();
    if (!clefRec) {
      throw new Error('Expected clef recommendation to exist');
    }

    act(() => {
      result.current.applyAction(clefRec, { toggleClef, setPracticeRange });
    });

    expect(toggleClef).toHaveBeenCalledTimes(1);
    expect(setPracticeRange).not.toHaveBeenCalled();
    expect(result.current.recommendations).toEqual([]);
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

  it('ignores recommendations without action in applyAction', () => {
    const { result } = renderHook(() => useRecommendations());

    const toggleClef = vi.fn();
    const setPracticeRange = vi.fn();

    act(() => {
      result.current.applyAction(
        {
          id: 'no-action',
          type: 'general',
          titleKey: 'title',
          descriptionKey: 'desc',
        },
        { toggleClef, setPracticeRange }
      );
    });

    expect(toggleClef).not.toHaveBeenCalled();
    expect(setPracticeRange).not.toHaveBeenCalled();
  });
});
