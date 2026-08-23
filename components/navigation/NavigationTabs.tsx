import { BookOpen, Languages, Library, Music } from 'lucide-react';
import React from 'react';

import { translations } from '../../i18n';

type NavigationTabsProps = {
  activeRoute: 'course' | 'randomPractice' | 'library';
  onNavigate: (route: 'course' | 'randomPractice' | 'library') => void;
  onToggleLang: () => void;
  t: typeof translations.en;
};

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeRoute,
  onNavigate,
  onToggleLang,
  t,
}) => (
  <nav
    aria-label={t.mainNavigation}
    className="relative z-20 w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700"
  >
    <div className="max-w-7xl mx-auto px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onNavigate('course')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeRoute === 'course'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          <BookOpen size={18} />
          {t.course}
        </button>
        <button
          onClick={() => onNavigate('randomPractice')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeRoute === 'randomPractice'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          <Music size={18} />
          {t.randomPractice}
        </button>
        <button
          onClick={() => onNavigate('library')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeRoute === 'library'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          <Library size={18} />
          {t.songLibrary}
        </button>
        {activeRoute !== 'randomPractice' && (
          <button
            onClick={onToggleLang}
            className="ml-auto flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title={t.languageToggle}
          >
            <Languages size={18} />
            <span className="hidden sm:inline">{t.languageToggle}</span>
          </button>
        )}
      </div>
    </div>
  </nav>
);
