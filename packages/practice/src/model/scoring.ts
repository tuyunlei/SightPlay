import type { SessionStats } from './types';

export function computeAccuracy(stats: SessionStats): number {
  return stats.totalAttempts === 0
    ? 100
    : Math.round((stats.cleanHits / stats.totalAttempts) * 100);
}

export function computeScore(previous: number, streak: number): number {
  return previous + 10 + streak * 2;
}

export function acceptAttempt(
  previous: SessionStats,
  hadMistake: boolean,
  elapsedMs: number
): SessionStats {
  const totalAttempts = previous.totalAttempts + 1;
  const cleanHits = hadMistake ? previous.cleanHits : previous.cleanHits + 1;
  const instantaneous = elapsedMs > 0 ? Math.min(300, Math.round(60_000 / elapsedMs)) : 0;
  const smoothed =
    previous.totalAttempts === 0
      ? instantaneous
      : Math.round(previous.bpm * 0.8 + instantaneous * 0.2);
  return {
    totalAttempts,
    cleanHits,
    bpm: elapsedMs < 8_000 ? smoothed : previous.bpm,
  };
}
