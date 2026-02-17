import { Info, Music } from 'lucide-react';
import React from 'react';

import { translations } from '../../i18n';
import { ClefType, Note } from '../../types';

interface QuickActionsProps {
  clef: ClefType;
  targetNote: Note | null;
  t: typeof translations.en;
  onSend: (text: string) => void;
}

const formatTemplate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template
  );

export const QuickActions: React.FC<QuickActionsProps> = ({ clef, targetNote, t, onSend }) => (
  <div className="grid grid-cols-2 gap-2">
    <button
      onClick={() => onSend(formatTemplate(t.aiQuickChallengePrompt, { clef }))}
      className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 border border-indigo-100 dark:border-indigo-800/50"
    >
      <Music size={14} /> {t.btnChallenge}
    </button>
    <button
      onClick={() => {
        if (targetNote) {
          const note = `${targetNote.name}${targetNote.octave}`;
          onSend(formatTemplate(t.aiQuickHintPromptWithNote, { note }));
        } else {
          onSend(t.aiQuickHintPromptFallback);
        }
      }}
      className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
    >
      <Info size={14} /> {t.btnHint}
    </button>
  </div>
);
