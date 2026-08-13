import { Lightbulb, X } from 'lucide-react';
import React from 'react';

import type { GuidanceRecommendation } from '@sightplay/guidance';

import { translations } from '../../i18n';

type TranslationMap = typeof translations.en;

interface RecommendationCardProps {
  recommendation: GuidanceRecommendation;
  t: TranslationMap;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  t,
  onApply,
  onDismiss,
}) => {
  const { title, description } = recommendationText(recommendation, t);

  return (
    <div
      data-testid="recommendation-card"
      className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30 px-4 py-3"
    >
      <Lightbulb size={18} className="mt-0.5 shrink-0 text-indigo-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-gray-600 dark:text-slate-300">{description}</p>
        {recommendation.action && (
          <button
            data-testid="recommendation-apply"
            onClick={() => onApply(recommendation.id)}
            className="mt-2 rounded bg-indigo-500 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-600 transition-colors"
          >
            {t.recApply}
          </button>
        )}
      </div>
      <button
        data-testid="recommendation-dismiss"
        onClick={() => onDismiss(recommendation.id)}
        className="shrink-0 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
      >
        <X size={16} />
      </button>
    </div>
  );
};

function recommendationText(
  recommendation: GuidanceRecommendation,
  t: TranslationMap
): { readonly title: string; readonly description: string } {
  const content = recommendation.content;
  switch (content.kind) {
    case 'tryHarderSong':
      return {
        title: t.recTryHarderSongTitle,
        description:
          content.difficulty === 'intermediate'
            ? t.recTryHarderSongDesc_intermediate
            : t.recTryHarderSongDesc_advanced,
      };
    case 'keepPracticing':
      return { title: t.recKeepPracticingTitle, description: t.recKeepPracticingDesc };
    case 'tryBass':
      return { title: t.recTryBassTitle, description: t.recTryBassDesc };
    case 'expandRange':
      return { title: t.recExpandRangeTitle, description: t.recExpandRangeDesc };
    case 'trySong':
      return { title: t.recTrySongTitle, description: t.recTrySongDesc };
    case 'narrowRange':
      return { title: t.recNarrowRangeTitle, description: t.recNarrowRangeDesc };
    case 'slowDown':
      return { title: t.recSlowDownTitle, description: t.recSlowDownDesc };
    default:
      return assertNever(content);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled Guidance recommendation: ${JSON.stringify(value)}`);
}
