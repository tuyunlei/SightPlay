import { Library, Music } from 'lucide-react';
import React from 'react';

import { translations } from '../../i18n';

export type ViewMode = 'random' | 'library' | 'song-practice';

type NavigationTabsProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  t: typeof translations.en;
};

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ viewMode, setViewMode, t }) => (
  <div className="relative z-20 w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
    <div className="max-w-7xl mx-auto px-4 py-3">
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('random')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'random'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          <Music size={18} />
          {t.randomPractice}
        </button>
        <button
          onClick={() => setViewMode('library')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'library'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          <Library size={18} />
          {t.songLibrary}
        </button>
      </div>
    </div>
  </div>
);
