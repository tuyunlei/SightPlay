import type { AppRoute } from '@sightplay/app-shell';

import type { RecommendationAction } from '../../domain/recommendations';
import type { ClefType, PracticeRangeMode } from '../../types';

export interface RecommendationActionPorts {
  selectClef: (clef: ClefType) => void;
  setPracticeRange: (range: PracticeRangeMode) => void;
  navigate: (route: AppRoute) => void;
}

export function applyRecommendationAction(
  action: RecommendationAction,
  ports: RecommendationActionPorts
): void {
  switch (action.kind) {
    case 'setClef':
      ports.selectClef(action.clef);
      return;
    case 'setPracticeRange':
      ports.setPracticeRange(action.range);
      return;
    case 'navigateDifficulty':
      ports.navigate({ kind: 'library', difficulty: action.difficulty });
      return;
    case 'navigateSong':
      ports.navigate({ kind: 'songPractice', songId: action.songId });
      return;
  }
}
