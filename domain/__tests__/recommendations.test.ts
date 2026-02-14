import { describe, expect, it } from 'vitest';

import { ClefType } from '../../types';
import { computeAccuracyPct, generateRecommendations, PracticeSnapshot } from '../recommendations';

const base: PracticeSnapshot = {
  totalAttempts: 0,
  cleanHits: 0,
  currentClef: ClefType.TREBLE,
  currentRange: 'central',
  practiceMode: 'random',
};

describe('computeAccuracyPct', () => {
  it('returns 100 when no attempts', () => {
    expect(computeAccuracyPct(base)).toBe(100);
  });

  it('computes percentage correctly', () => {
    expect(computeAccuracyPct({ ...base, totalAttempts: 20, cleanHits: 18 })).toBe(90);
  });
});

describe('generateRecommendations', () => {
  it('returns empty for fewer than 20 random attempts', () => {
    const snap = { ...base, totalAttempts: 10, cleanHits: 10 };
    expect(generateRecommendations(snap)).toEqual([]);
  });

  it('suggests bass clef when treble accuracy > 90%', () => {
    const snap = { ...base, totalAttempts: 25, cleanHits: 24 };
    const recs = generateRecommendations(snap);
    expect(recs.some((r) => r.id === 'clef-try-bass')).toBe(true);
  });

  it('suggests expanding range when central and accuracy > 90%', () => {
    const snap = { ...base, totalAttempts: 25, cleanHits: 24 };
    const recs = generateRecommendations(snap);
    expect(recs.some((r) => r.id === 'range-expand')).toBe(true);
  });

  it('limits to 2 recommendations', () => {
    const snap = { ...base, totalAttempts: 25, cleanHits: 24 };
    expect(generateRecommendations(snap).length).toBeLessThanOrEqual(2);
  });

  it('suggests narrowing range when accuracy < 50% and not central', () => {
    const snap: PracticeSnapshot = {
      ...base,
      totalAttempts: 25,
      cleanHits: 5,
      currentRange: 'combined',
    };
    const recs = generateRecommendations(snap);
    expect(recs.some((r) => r.id === 'range-narrow')).toBe(true);
  });

  it('suggests slow down when accuracy < 50%', () => {
    const snap = { ...base, totalAttempts: 25, cleanHits: 5 };
    const recs = generateRecommendations(snap);
    expect(recs.some((r) => r.id === 'general-slow-down')).toBe(true);
  });

  it('returns song-complete recs for beginner', () => {
    const snap: PracticeSnapshot = {
      ...base,
      practiceMode: 'song',
      completedSongDifficulty: 'beginner',
    };
    const recs = generateRecommendations(snap);
    expect(recs.some((r) => r.id === 'song-next-intermediate')).toBe(true);
  });

  it('returns keep-going for advanced completion', () => {
    const snap: PracticeSnapshot = {
      ...base,
      practiceMode: 'song',
      completedSongDifficulty: 'advanced',
    };
    const recs = generateRecommendations(snap);
    expect(recs.some((r) => r.id === 'general-keep-going')).toBe(true);
    // no next difficulty
    expect(recs.every((r) => !r.id.startsWith('song-next-'))).toBe(true);
  });

  it('does not suggest bass clef when already on bass', () => {
    const snap: PracticeSnapshot = {
      ...base,
      totalAttempts: 25,
      cleanHits: 24,
      currentClef: ClefType.BASS,
    };
    const recs = generateRecommendations(snap);
    expect(recs.every((r) => r.id !== 'clef-try-bass')).toBe(true);
  });

  it('does not suggest range expand when already combined', () => {
    const snap: PracticeSnapshot = {
      ...base,
      totalAttempts: 25,
      cleanHits: 24,
      currentRange: 'combined',
      currentClef: ClefType.BASS,
    };
    const recs = generateRecommendations(snap);
    expect(recs.every((r) => r.id !== 'range-expand')).toBe(true);
  });
});
