import { SessionStats } from '../types/session';

export const computeScore = (prevScore: number, streak: number) => prevScore + 10 + streak * 2;

export const computeAccuracy = (stats: SessionStats) => {
  if (stats.totalAttempts === 0) return 100;
  return Math.round((stats.cleanHits / stats.totalAttempts) * 100);
};

type UpdateStatsParams = {
  prev: SessionStats;
  hasMistake: boolean;
  timeDiffMs: number;
};

export const updateSessionStats = ({
  prev,
  hasMistake,
  timeDiffMs,
}: UpdateStatsParams): SessionStats => {
  const totalAttempts = prev.totalAttempts + 1;
  const cleanHits = hasMistake ? prev.cleanHits : prev.cleanHits + 1;
  const instantaneousBpm = timeDiffMs > 0 ? Math.min(300, Math.round(60000 / timeDiffMs)) : 0;
  const smoothedBpm =
    prev.totalAttempts === 0
      ? instantaneousBpm
      : Math.round(prev.bpm * 0.8 + instantaneousBpm * 0.2);
  const bpm = timeDiffMs < 8000 ? smoothedBpm : prev.bpm;

  return {
    totalAttempts,
    cleanHits,
    bpm,
  };
};
