import React from 'react';
import { Activity, Languages, Mic, MicOff, Music, RefreshCw, Target, Trophy } from 'lucide-react';
import { ClefType } from '../../types';
import { translations } from '../../i18n';

interface TopBarProps {
  isListening: boolean;
  clef: ClefType;
  score: number;
  bpm: number;
  accuracy: number;
  onToggleMic: () => void;
  onToggleClef: () => void;
  onToggleLang: () => void;
  onResetStats: () => void;
  t: typeof translations.en;
}

const TopBar: React.FC<TopBarProps> = ({
  isListening,
  clef,
  score,
  bpm,
  accuracy,
  onToggleMic,
  onToggleClef,
  onToggleLang,
  onResetStats,
  t
}) => (
  <nav className="relative z-30 w-full flex flex-col backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0">
    <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-1.5 rounded-lg text-white shadow-lg shadow-indigo-500/20">
          <Music size={20} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold leading-none tracking-tight hidden sm:block">PitchPerfect</h1>
          <h1 className="text-lg font-bold leading-none tracking-tight sm:hidden">PitchPerfect</h1>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6 px-4">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-yellow-500" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{score}</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-cyan-500" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{bpm} BPM</span>
        </div>
        <div className="flex items-center gap-2">
          <Target size={14} className="text-emerald-500" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{accuracy}%</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMic}
          className={`p-2 rounded-full transition-all ${
            isListening
              ? 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/30 animate-pulse'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/30'
          }`}
          title={isListening ? t.btnMicStop : t.btnMicStart}
        >
          {isListening ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        <button
          onClick={onToggleClef}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
        >
          {clef === ClefType.TREBLE ? <span className="text-xl font-serif">𝄞</span> : <span className="text-xl font-serif">𝄢</span>}
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

        <button onClick={onToggleLang} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-500 dark:text-slate-400">
          <Languages size={18} />
        </button>
        <button onClick={onResetStats} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-500 dark:text-slate-400">
          <RefreshCw size={18} />
        </button>
      </div>
    </div>

    <div className="md:hidden px-4 pb-2 border-t border-slate-100 dark:border-slate-800/50 mt-1">
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold">{t.score}</span>
          <span className="text-sm font-bold">{score}</span>
        </div>
        <div className="w-px h-6 bg-slate-100 dark:bg-slate-800"></div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold">{t.bpm}</span>
          <span className="text-sm font-bold">{bpm}</span>
        </div>
        <div className="w-px h-6 bg-slate-100 dark:bg-slate-800"></div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold">{t.accuracy}</span>
          <span className="text-sm font-bold">{accuracy}%</span>
        </div>
      </div>
    </div>
  </nav>
);

export default TopBar;
