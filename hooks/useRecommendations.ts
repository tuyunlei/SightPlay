import { useCallback, useMemo, useState } from 'react';

import { SongDifficulty } from '../data/songs/types';
import {
  generateRecommendations,
  PracticeSnapshot,
  Recommendation,
  RecommendationAction,
} from '../domain/recommendations';
import { usePracticeStore } from '../store/practiceStore';
import { PracticeRangeMode } from '../types';

interface PracticeCallbacks {
  toggleClef: () => void;
  setPracticeRange: (range: PracticeRangeMode) => void;
}

export function useRecommendations() {
  const [completedDifficulty, setCompletedDifficulty] = useState<SongDifficulty | undefined>();
  const [dismissed, setDismissed] = useState(false);

  const clef = usePracticeStore((s) => s.clef);
  const practiceRange = usePracticeStore((s) => s.practiceRange);
  const practiceMode = usePracticeStore((s) => s.practiceMode);
  const sessionStats = usePracticeStore((s) => s.sessionStats);

  const snapshot: PracticeSnapshot = useMemo(
    () => ({
      totalAttempts: sessionStats.totalAttempts,
      cleanHits: sessionStats.cleanHits,
      currentClef: clef,
      currentRange: practiceRange,
      practiceMode,
      completedSongDifficulty: completedDifficulty,
    }),
    [sessionStats, clef, practiceRange, practiceMode, completedDifficulty]
  );

  const recommendations: Recommendation[] = useMemo(() => {
    if (dismissed) return [];
    return generateRecommendations(snapshot);
  }, [snapshot, dismissed]);

  const onSongComplete = useCallback((difficulty: SongDifficulty) => {
    setDismissed(false);
    setCompletedDifficulty(difficulty);
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  const applyAction = useCallback(
    (rec: Recommendation, cbs: PracticeCallbacks) => {
      const action = rec.action as RecommendationAction | undefined;
      if (!action) return;
      if (action.kind === 'setClef') cbs.toggleClef();
      if (action.kind === 'setPracticeRange') cbs.setPracticeRange(action.range);
      dismiss();
    },
    [dismiss]
  );

  const reset = useCallback(() => {
    setDismissed(false);
    setCompletedDifficulty(undefined);
  }, []);

  return { recommendations, onSongComplete, dismiss, applyAction, reset };
}
