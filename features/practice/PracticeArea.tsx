import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Music, Piano } from 'lucide-react';
import StaffDisplay from '../../components/StaffDisplay';
import PianoDisplay from '../../components/PianoDisplay';
import { ClefType, GeneratedChallenge, Note } from '../../types';
import { PracticeStatus } from '../../store/practiceStore';
import { translations } from '../../i18n';
import { getNoteLabels } from '../../config/music';

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
  isMidiConnected
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

        <div className="absolute bottom-3 left-3">
          <div className="bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-3 py-2 rounded-xl shadow-lg backdrop-blur-md border border-slate-700/50 flex items-center gap-4">
            {targetNote ? (
              <>
                <div>
                  <span className="block text-[8px] opacity-70 uppercase tracking-widest font-bold mb-0.5">{t.target}</span>
                  <div className="flex items-baseline leading-none">
                    <span className="text-2xl font-black font-mono">{targetNote.name}</span>
                    <span className="text-sm font-bold opacity-60 ml-0.5">{targetNote.octave}</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-current opacity-20"></div>
                <div className="flex flex-col items-center leading-none">
                  <span className="text-base font-bold text-yellow-400 dark:text-indigo-600">
                    {getNoteLabels(targetNote.name).solfege}
                  </span>
                  <span className="text-[10px] font-mono font-bold opacity-80 mt-1">
                    {getNoteLabels(targetNote.name).number}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-sm font-bold">Complete!</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowPiano((prev) => !prev)}
          className="absolute bottom-3 right-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-lg shadow-sm transition-all border border-slate-200 dark:border-slate-700"
        >
          {showPiano ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <div className={`w-full transition-all duration-500 ease-in-out overflow-hidden mt-2 rounded-xl shadow-lg ${showPiano ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <PianoDisplay targetNote={targetNote} detectedNote={detectedNote} pressedKeys={pressedKeys} />
      </div>
    </div>

    {challengeSequence.length > 0 && (
      <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Music size={16} className="text-indigo-500" />
            {challengeInfo?.title}
          </span>
          <span className="text-xs font-mono text-slate-500">{challengeIndex} / {challengeSequence.length}</span>
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
