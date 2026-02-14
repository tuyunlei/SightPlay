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

  const grade = getGrade(accuracy);
  const gradeColor = getGradeColor(grade);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t.songCompleteTitle}</h2>
          <p className="text-xl text-gray-600 mb-6">{songTitle}</p>

          {/* Grade */}
          <div className={`text-8xl font-bold mb-6 ${gradeColor}`}>{grade}</div>

          {/* Stats */}
          <div className="space-y-3 mb-8">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">{t.accuracy}</span>
              <span className="text-2xl font-semibold text-gray-900">{accuracy}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">{t.correctNotes}</span>
              <span className="text-xl font-semibold text-gray-900">
                {correctNotes} / {totalAttempts}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">{t.time}</span>
              <span className="text-xl font-semibold text-gray-900">
                {formatSongTime(timeElapsed)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              {t.retrySong}
            </button>
            <button
              onClick={onBackToLibrary}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
            >
              {t.backToLibrary}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
