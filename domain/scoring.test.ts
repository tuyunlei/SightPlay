import { describe, expect, it } from 'vitest';
import { computeAccuracy, computeScore, updateSessionStats } from './scoring';

describe('scoring', () => {
  it('computes score with streak bonus', () => {
    expect(computeScore(0, 0)).toBe(10);
    expect(computeScore(10, 2)).toBe(24);
  });

  it('computes accuracy with empty stats', () => {
    expect(computeAccuracy({ totalAttempts: 0, cleanHits: 0, bpm: 0 })).toBe(100);
  });

  it('updates session stats with bpm smoothing', () => {
    const next = updateSessionStats({
      prev: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
      hasMistake: false,
      timeDiffMs: 1000
    });

    expect(next.totalAttempts).toBe(1);
    expect(next.cleanHits).toBe(1);
    expect(next.bpm).toBe(60);
  });
});
