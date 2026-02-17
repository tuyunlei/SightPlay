import React from 'react';

import { formatSongTime } from '../../domain/song';
import { useLanguage } from '../../hooks/useLanguage';

interface SongCompleteProps {
  songTitle: string;
  accuracy: number;
  totalAttempts: number;
  correctNotes: number;
  timeElapsed: number | null;
  onRetry: () => void;
  onBackToLibrary: () => void;
}

const getGrade = (acc: number): string => {
  if (acc >= 95) return 'S';
  if (acc >= 85) return 'A';
  if (acc >= 75) return 'B';
  if (acc >= 65) return 'C';
  return 'D';
};

const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'S':
      return 'text-yellow-500';
    case 'A':
      return 'text-green-500';
    case 'B':
      return 'text-blue-500';
    case 'C':
      return 'text-orange-500';
    default:
      return 'text-gray-500';
  }
};

export const SongComplete: React.FC<SongCompleteProps> = ({
  songTitle,
  accuracy,
  totalAttempts,
  correctNotes,
  timeElapsed,
  onRetry,
  onBackToLibrary,
}) => {
  const { t } = useLanguage();
  const grade = getGrade(accuracy);
  const gradeColor = getGradeColor(grade);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-overlay)]">
      <div className="mx-4 w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
        <div className="text-center">
          <h2 className="mb-2 text-3xl font-bold text-gray-900 dark:text-slate-100">
            {t.songCompleteTitle}
          </h2>
          <p className="mb-6 text-xl text-gray-600 dark:text-slate-300">{songTitle}</p>

          <div className={`mb-6 text-8xl font-bold ${gradeColor}`}>{grade}</div>

          <div className="mb-8 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 py-2 dark:border-slate-700">
              <span className="text-gray-600 dark:text-slate-300">{t.accuracy}</span>
              <span className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                {accuracy}%
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 py-2 dark:border-slate-700">
              <span className="text-gray-600 dark:text-slate-300">{t.correctNotes}</span>
              <span className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {correctNotes} / {totalAttempts}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 py-2 dark:border-slate-700">
              <span className="text-gray-600 dark:text-slate-300">{t.time}</span>
              <span className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {formatSongTime(timeElapsed)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="flex-1 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600"
            >
              {t.retrySong}
            </button>
            <button
              onClick={onBackToLibrary}
              className="flex-1 rounded-lg bg-gray-200 px-6 py-3 font-medium text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              {t.backToLibrary}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
