import { useState } from 'react';

import { SongDifficulty } from '../data/songs/types';
import {
  generateRecommendations,
  PracticeSnapshot,
  Recommendation,
} from '../domain/recommendations';
import { usePracticeStore } from '../store/practiceStore';

export function useRecommendations() {
  const [completedDifficulty, setCompletedDifficulty] = useState<SongDifficulty | undefined>();
  const [dismissed, setDismissed] = useState(false);

  const clef = usePracticeStore((s) => s.clef);
  const practiceRange = usePracticeStore((s) => s.practiceRange);
  const practiceMode = usePracticeStore((s) => s.practiceMode);
  const sessionStats = usePracticeStore((s) => s.sessionStats);

  const snapshot: PracticeSnapshot = {
    totalAttempts: sessionStats.totalAttempts,
    cleanHits: sessionStats.cleanHits,
    currentClef: clef,
    currentRange: practiceRange,
    practiceMode,
    completedSongDifficulty: completedDifficulty,
  };

  const recommendations: Recommendation[] = dismissed ? [] : generateRecommendations(snapshot);

  const onSongComplete = (difficulty: SongDifficulty) => {
    setDismissed(false);
    setCompletedDifficulty(difficulty);
  };

  const dismiss = () => setDismissed(true);

  const reset = () => {
    setDismissed(false);
    setCompletedDifficulty(undefined);
  };

  return { recommendations, onSongComplete, dismiss, reset };
}
