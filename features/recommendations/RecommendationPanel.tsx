import React from 'react';

import type { GuidanceRecommendation } from '@sightplay/guidance';

import { translations } from '../../i18n';

import { RecommendationCard } from './RecommendationCard';

type TranslationMap = typeof translations.en;

interface RecommendationPanelProps {
  recommendations: readonly GuidanceRecommendation[];
  t: TranslationMap;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  recommendations,
  t,
  onApply,
  onDismiss,
}) => {
  if (recommendations.length === 0) return null;

  return (
    <div data-testid="recommendation-panel" className="mt-4 flex flex-col gap-2">
      {recommendations.map((rec) => (
        <RecommendationCard
          key={rec.id}
          recommendation={rec}
          t={t}
          onApply={onApply}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};
