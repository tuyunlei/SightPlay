import { X } from 'lucide-react';
import React from 'react';

import type { GuidanceHint } from '@sightplay/guidance';

import { translations } from '../../i18n';

interface HintBubbleProps {
  hint: GuidanceHint | null;
  t: typeof translations.en;
  onDismiss: () => void;
}

export const HintBubble: React.FC<HintBubbleProps> = ({ hint, t, onDismiss }) => {
  if (!hint) return null;

  const bgClass =
    hint.type === 'encouragement'
      ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700'
      : 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700';

  const textClass =
    hint.type === 'encouragement'
      ? 'text-emerald-800 dark:text-emerald-200'
      : 'text-amber-800 dark:text-amber-200';

  return (
    <div
      data-testid="hint-bubble"
      className={`absolute top-2 left-1/2 -translate-x-1/2 z-20 max-w-sm px-4 py-2 rounded-xl border shadow-lg backdrop-blur-sm flex items-center gap-2 animate-fade-in ${bgClass}`}
    >
      <span className={`text-sm font-medium ${textClass}`}>{hintText(hint, t)}</span>
      <button
        onClick={onDismiss}
        data-testid="hint-dismiss"
        className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition"
      >
        <X size={14} className={textClass} />
      </button>
    </div>
  );
};

function hintText(hint: GuidanceHint, t: typeof translations.en): string {
  if (hint.content.kind === 'providerText') return hint.content.text;
  const keys = {
    greatStreak: 'hintGreatStreak',
    awesome: 'hintAwesome',
    trySlower: 'hintTrySlower',
    keepGoing: 'hintKeepGoing',
    practiceRange: 'hintPracticeRange',
  } as const;
  return t[keys[hint.content.message]];
}
