import { Lightbulb, X } from 'lucide-react';
import React from 'react';

import type { Recommendation } from '../../domain/recommendations';
import { translations } from '../../i18n';

type TranslationMap = typeof translations.en;

interface RecommendationCardProps {
  recommendation: Recommendation;
  t: TranslationMap;
  onApply: (rec: Recommendation) => void;
  onDismiss: (id: string) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  t,
  onApply,
  onDismiss,
}) => {
  const title = (t as Record<string, string>)[recommendation.titleKey] ?? recommendation.titleKey;
  const desc =
    (t as Record<string, string>)[recommendation.descriptionKey] ?? recommendation.descriptionKey;

  return (
    <div
      data-testid="recommendation-card"
      className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3"
    >
      <Lightbulb size={18} className="mt-0.5 shrink-0 text-indigo-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-600">{desc}</p>
        {recommendation.action && (
          <button
            data-testid="recommendation-apply"
            onClick={() => onApply(recommendation)}
            className="mt-2 rounded bg-indigo-500 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-600 transition-colors"
          >
            {(t as Record<string, string>)['recApply'] ?? 'Try it'}
          </button>
        )}
      </div>
      <button
        data-testid="recommendation-dismiss"
        onClick={() => onDismiss(recommendation.id)}
        className="shrink-0 text-gray-400 hover:text-gray-600"
      >
        <X size={16} />
      </button>
    </div>
  );
};
