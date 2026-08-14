import React from 'react';

import { usePractice } from '@sightplay/practice';

import { useLanguage } from '../../app/presentation/useLanguage';
import { getSongById } from '../../data/songs';
import PracticeArea from '../practice/PracticeArea';

interface SongPracticeProps {
  songId: string;
  onExit: () => void;
}

function formatElapsed(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export const SongPractice: React.FC<SongPracticeProps> = ({ songId, onExit }) => {
  const { t } = useLanguage();
  const practice = usePractice();
  const song = getSongById(songId);
  const { view } = practice;

  if (!song) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400">{t.songNotFound}</p>
        <button onClick={onExit} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          {t.backToLibrary}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-white dark:bg-slate-900 border-b-2 border-gray-200 dark:border-slate-700 p-4 mb-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{song.title}</h2>
            <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-slate-300">
              <span>{`${t.progress}: ${view.progress}%`}</span>
              <span>•</span>
              <span>{`${t.accuracy}: ${view.accuracy}%`}</span>
              <span>•</span>
              <span>{`${t.time}: ${formatElapsed(view.elapsedMs)}`}</span>
            </div>
          </div>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
          >
            {t.exitSong}
          </button>
        </div>
        <div className="max-w-4xl mx-auto mt-4">
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${view.progress}%` }}
            />
          </div>
        </div>
      </div>
      <PracticeArea
        view={view}
        t={t}
        onPracticeRangeChange={practice.selectPracticeRange}
        onHandModeChange={practice.selectHandMode}
      />
    </div>
  );
};
