import React from 'react';

import { translations } from '../../i18n';
import { PracticeRangeMode } from '../../types';

export type PracticeRangeSelectorProps = {
  value: PracticeRangeMode;
  onChange: (mode: PracticeRangeMode) => void;
  t: typeof translations.en;
  disabled?: boolean;
};

export const PracticeRangeSelector: React.FC<PracticeRangeSelectorProps> = ({
  value,
  onChange,
  t,
  disabled = false,
}) => {
  const options: { value: PracticeRangeMode; label: string }[] = [
    { value: 'central', label: t.practiceRangeCentral },
    { value: 'upper', label: t.practiceRangeUpper },
    { value: 'combined', label: t.practiceRangeCombined },
  ];

  return (
    <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/70">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {t.practiceRangeLabel}
        </span>
      </div>
      <div
        className={`mt-2 inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 ${disabled ? 'opacity-60' : ''}`}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            aria-pressed={value === option.value}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition disabled:cursor-not-allowed ${
              value === option.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
