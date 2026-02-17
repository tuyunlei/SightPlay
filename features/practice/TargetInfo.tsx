import React from 'react';

import { getNoteLabels } from '../../config/music';
import { translations } from '../../i18n';
import { Note } from '../../types';

export type TargetInfoProps = {
  targetNote: Note | null;
  t: typeof translations.en;
};

const JianpuDots: React.FC<{ count: number; className?: string }> = ({ count, className }) => (
  <div className={`flex items-center gap-1 ${className ?? ''}`}>
    {Array.from({ length: count }).map((_, i) => (
      <span key={`jianpu-dot-${i}`} className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
    ))}
  </div>
);

export const TargetInfo: React.FC<TargetInfoProps> = ({ targetNote, t }) => {
  if (!targetNote) return <span className="text-sm font-bold">{t.challengeStatusComplete}</span>;
  const labels = getNoteLabels(targetNote.name);
  const upDots = Math.max(0, targetNote.octave - 4);
  const downDots = Math.max(0, 4 - targetNote.octave);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-x-10 gap-y-3">
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-70 mb-1">
          {t.noteNameLabel}
        </span>
        <div className="h-9 flex items-end">
          <div className="flex items-baseline leading-none">
            <span className="text-2xl font-black font-mono">{targetNote.name}</span>
            <span className="text-sm font-bold opacity-60 ml-0.5">{targetNote.octave}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-70 mb-1">
          {t.solfegeLabel}
        </span>
        <div className="h-9 flex items-end">
          <span className="text-2xl font-black text-yellow-400 dark:text-indigo-600">
            {labels.solfege}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center leading-none">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-70 mb-1">
          {t.jianpuLabel}
        </span>
        <div className="relative h-9 flex items-center justify-center">
          {upDots > 0 && (
            <JianpuDots count={upDots} className="absolute top-0 left-1/2 -translate-x-1/2" />
          )}
          <span className="text-2xl font-black opacity-90">{labels.number}</span>
          {downDots > 0 && (
            <JianpuDots count={downDots} className="absolute bottom-0 left-1/2 -translate-x-1/2" />
          )}
        </div>
      </div>
    </div>
  );
};
