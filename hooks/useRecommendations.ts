import { useState } from 'react';

import type { PracticeView } from '@sightplay/practice';

import {
  generateRecommendations,
  PracticeSnapshot,
  Recommendation,
} from '../domain/recommendations';
import { ClefType } from '../types';

export function useRecommendations(view: PracticeView) {
  const contextKey = `${view.source}:${view.metadata.id}:${view.completion.kind}`;
  const [dismissedContext, setDismissedContext] = useState<string | null>(null);

  const snapshot: PracticeSnapshot = {
    totalAttempts: view.sessionStats.totalAttempts,
    cleanHits: view.sessionStats.cleanHits,
    currentClef: view.clef === 'treble' ? ClefType.TREBLE : ClefType.BASS,
    currentRange: view.practiceRange,
    practiceMode: view.source,
    completedSongDifficulty:
      view.source === 'song' && view.completion.kind === 'completed'
        ? view.metadata.difficulty
        : undefined,
  };

  const recommendations: Recommendation[] =
    dismissedContext === contextKey ? [] : generateRecommendations(snapshot);
  const dismiss = () => setDismissedContext(contextKey);

  return { recommendations, dismiss };
}
