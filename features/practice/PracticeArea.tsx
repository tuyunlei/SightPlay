import { ChevronDown, ChevronUp, Music, Piano } from 'lucide-react';
import React, { useState } from 'react';

import PianoDisplay from '../../components/PianoDisplay';
import StaffDisplay from '../../components/StaffDisplay';
import { getNoteLabels } from '../../config/music';
import { translations } from '../../i18n';
import { PracticeStatus } from '../../store/practiceStore';
import { ClefType, GeneratedChallenge, Note } from '../../types';

interface PracticeAreaProps {
  clef: ClefType;
  noteQueue: Note[];
  exitingNotes: Note[];
  detectedNote: Note | null;
  status: PracticeStatus;
  targetNote: Note | null;
  pressedKeys: Map<number, { note: Note; isCorrect: boolean }>;
  challengeSequence: Note[];
  challengeIndex: number;
  challengeInfo: GeneratedChallenge | null;
  t: typeof translations.en;
  isMidiConnected: boolean;
}

type TargetInfoProps = {
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

const TargetInfo: React.FC<TargetInfoProps> = ({ targetNote, t }) => {
  if (!targetNote) return <span className="text-sm font-bold">Complete!</span>;
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

type FooterBarProps = {
  targetNote: Note | null;
  t: typeof translations.en;
  showPiano: boolean;
  onTogglePiano: () => void;
};

const FooterBar: React.FC<FooterBarProps> = ({ targetNote, t, showPiano, onTogglePiano }) => (
  <div className="px-3 pb-3">
    <div className="bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md border border-slate-700/50">
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
        <TargetInfo targetNote={targetNote} t={t} />
        <button
          onClick={onTogglePiano}
          className="self-end sm:self-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-lg shadow-sm transition-all border border-slate-200 dark:border-slate-700"
        >
          {showPiano ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
    </div>
  </div>
);

const PracticeArea: React.FC<PracticeAreaProps> = ({
  clef,
  noteQueue,
  exitingNotes,
  detectedNote,
  status,
  targetNote,
  pressedKeys,
  challengeSequence,
  challengeIndex,
  challengeInfo,
  t,
  isMidiConnected,
}) => {
  const [showPiano, setShowPiano] = useState(true);

  return (
    <div className="lg:col-span-2 flex flex-col gap-4 justify-start">
      <div className="w-full relative group">
        {isMidiConnected && (
          <div className="absolute -top-3 left-4 z-20 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shadow-sm">
            <Piano size={10} /> MIDI ACTIVE
          </div>
        )}

        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-1 min-h-[220px]">
            <StaffDisplay
              clef={clef}
              noteQueue={noteQueue}
              exitingNotes={exitingNotes}
              detectedNote={detectedNote}
              status={status}
              micLabel={t.micOn}
            />
          </div>

          <FooterBar
            targetNote={targetNote}
            t={t}
            showPiano={showPiano}
            onTogglePiano={() => setShowPiano((prev) => !prev)}
          />
        </div>

        <div
          className={`w-full transition-all duration-500 ease-in-out overflow-hidden mt-2 rounded-xl shadow-lg ${showPiano ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <PianoDisplay
            targetNote={targetNote}
            detectedNote={detectedNote}
            pressedKeys={pressedKeys}
          />
        </div>
      </div>

      {challengeSequence.length > 0 && (
        <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Music size={16} className="text-indigo-500" />
              {challengeInfo?.title}
            </span>
            <span className="text-xs font-mono text-slate-500">
              {challengeIndex} / {challengeSequence.length}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(challengeIndex / challengeSequence.length) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeArea;
