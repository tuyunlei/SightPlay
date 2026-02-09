import { describe, expect, it } from 'vitest';

import { computeAccuracy, computeScore, updateSessionStats } from './scoring';

describe('scoring', () => {
  describe('computeScore', () => {
    it('computes base score of 10 with no streak', () => {
      expect(computeScore(0, 0)).toBe(10);
    });

    it('adds streak bonus of 2 per streak', () => {
      expect(computeScore(10, 2)).toBe(24); // 10 + 10 + 2*2
      expect(computeScore(0, 5)).toBe(20); // 0 + 10 + 5*2
    });
  });

  describe('computeAccuracy', () => {
    it('returns 100 when no attempts made', () => {
      expect(computeAccuracy({ totalAttempts: 0, cleanHits: 0, bpm: 0 })).toBe(100);
    });

    it('computes percentage of clean hits', () => {
      expect(computeAccuracy({ totalAttempts: 10, cleanHits: 7, bpm: 60 })).toBe(70);
    });

    it('rounds to nearest integer', () => {
      expect(computeAccuracy({ totalAttempts: 3, cleanHits: 1, bpm: 60 })).toBe(33);
    });

    it('returns 0 when all attempts have mistakes', () => {
      expect(computeAccuracy({ totalAttempts: 5, cleanHits: 0, bpm: 60 })).toBe(0);
    });
  });

  describe('updateSessionStats', () => {
    const freshStats = { totalAttempts: 0, cleanHits: 0, bpm: 0 };

    it('increments totalAttempts', () => {
      const next = updateSessionStats({ prev: freshStats, hasMistake: false, timeDiffMs: 1000 });
      expect(next.totalAttempts).toBe(1);
    });

    it('increments cleanHits when no mistake', () => {
      const next = updateSessionStats({ prev: freshStats, hasMistake: false, timeDiffMs: 1000 });
      expect(next.cleanHits).toBe(1);
    });

    it('does not increment cleanHits when there is a mistake', () => {
      const next = updateSessionStats({ prev: freshStats, hasMistake: true, timeDiffMs: 1000 });
      expect(next.cleanHits).toBe(0);
    });

    it('uses instantaneous BPM directly for first attempt', () => {
      const next = updateSessionStats({ prev: freshStats, hasMistake: false, timeDiffMs: 500 });
      // 60000/500 = 120 BPM
      expect(next.bpm).toBe(120);
    });

    it('applies exponential smoothing for subsequent attempts', () => {
      const prev = { totalAttempts: 1, cleanHits: 1, bpm: 60 };
      const next = updateSessionStats({ prev, hasMistake: false, timeDiffMs: 500 });
      // instantaneous = 120, smoothed = round(60*0.8 + 120*0.2) = round(48+24) = 72
      expect(next.bpm).toBe(72);
    });

    it('caps instantaneous BPM at 300', () => {
      const next = updateSessionStats({ prev: freshStats, hasMistake: false, timeDiffMs: 50 });
      // 60000/50 = 1200, capped to 300
      expect(next.bpm).toBe(300);
    });

    it('returns 0 instantaneous BPM when timeDiffMs is 0', () => {
      const next = updateSessionStats({ prev: freshStats, hasMistake: false, timeDiffMs: 0 });
      expect(next.bpm).toBe(0);
    });

    it('keeps previous BPM when timeDiffMs >= 8000 (stale)', () => {
      const prev = { totalAttempts: 5, cleanHits: 5, bpm: 80 };
      const next = updateSessionStats({ prev, hasMistake: false, timeDiffMs: 8000 });
      expect(next.bpm).toBe(80);
    });

    it('updates BPM when timeDiffMs < 8000', () => {
      const prev = { totalAttempts: 5, cleanHits: 5, bpm: 80 };
      const next = updateSessionStats({ prev, hasMistake: false, timeDiffMs: 7999 });
      expect(next.bpm).not.toBe(80);
    });
  });
});
