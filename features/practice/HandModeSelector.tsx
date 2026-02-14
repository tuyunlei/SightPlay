import React from 'react';

import { translations } from '../../i18n';
import { HandPracticeMode } from '../../types';

interface HandModeSelectorProps {
  value: HandPracticeMode;
  onChange: (mode: HandPracticeMode) => void;
  t: typeof translations.en;
  disabled?: boolean;
}

const HAND_MODE_OPTIONS: { value: HandPracticeMode; labelKey: keyof typeof translations.en }[] = [
  { value: 'right-hand', labelKey: 'rightHand' },
  { value: 'left-hand', labelKey: 'leftHand' },
  { value: 'both-hands', labelKey: 'bothHands' },
];

export const HandModeSelector: React.FC<HandModeSelectorProps> = ({
  value,
  onChange,
  t,
  disabled = false,
}) => (
  <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
    {HAND_MODE_OPTIONS.map((option) => (
      <button
        key={option.value}
        onClick={() => !disabled && onChange(option.value)}
        disabled={disabled}
        className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
          value === option.value
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {t[option.labelKey]}
      </button>
    ))}
  </div>
);
