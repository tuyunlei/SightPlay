import { ChevronDown, ChevronUp, Piano } from 'lucide-react';
import React, { useState } from 'react';

import PianoDisplay from '../../components/PianoDisplay';
import StaffDisplay from '../../components/StaffDisplay';
import { translations } from '../../i18n';
import { PracticeStatus } from '../../store/practiceStore';
import { ClefType, GeneratedChallenge, Note, PracticeRangeMode } from '../../types';

import { ChallengeProgress } from './ChallengeProgress';
import { PracticeRangeSelector } from './PracticeRangeSelector';
import { TargetInfo } from './TargetInfo';

interface PracticeAreaProps {
  clef: ClefType;
  practiceRange: PracticeRangeMode;
  noteQueue: Note[];
  exitingNotes: Note[];
  detectedNote: Note | null;
  status: PracticeStatus;
  targetNote: Note | null;
  pressedKeys: Map<number, { note: Note; isCorrect: boolean; targetId?: string | null }>;
  challengeSequence: Note[];
  challengeIndex: number;
  challengeInfo: GeneratedChallenge | null;
  t: typeof translations.en;
  isMidiConnected: boolean;
  onPracticeRangeChange: (mode: PracticeRangeMode) => void;
}

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

type PracticeMainPanelProps = {
  clef: ClefType;
  practiceRange: PracticeRangeMode;
  noteQueue: Note[];
  exitingNotes: Note[];
  detectedNote: Note | null;
  status: PracticeStatus;
  targetNote: Note | null;
  pressedKeys: Map<number, { note: Note; isCorrect: boolean; targetId?: string | null }>;
  t: typeof translations.en;
  isMidiConnected: boolean;
  isChallengeActive: boolean;
  onPracticeRangeChange: (mode: PracticeRangeMode) => void;
};

const PracticeMainPanel: React.FC<PracticeMainPanelProps> = ({
  clef,
  practiceRange,
  noteQueue,
  exitingNotes,
  detectedNote,
  status,
  targetNote,
  pressedKeys,
  t,
  isMidiConnected,
  isChallengeActive,
  onPracticeRangeChange,
}) => {
  const [showPiano, setShowPiano] = useState(true);

  return (
    <div className="w-full relative group">
      {isMidiConnected && (
        <div className="absolute -top-3 left-4 z-20 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shadow-sm">
          <Piano size={10} /> MIDI ACTIVE
        </div>
      )}

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
        <PracticeRangeSelector
          value={practiceRange}
          onChange={onPracticeRangeChange}
          t={t}
          disabled={isChallengeActive}
        />
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
  );
};

const PracticeArea: React.FC<PracticeAreaProps> = ({
  clef,
  practiceRange,
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
  onPracticeRangeChange,
}) => {
  const isChallengeActive = challengeSequence.length > 0;

  return (
    <div className="lg:col-span-2 flex flex-col gap-4 justify-start">
      <PracticeMainPanel
        clef={clef}
        practiceRange={practiceRange}
        noteQueue={noteQueue}
        exitingNotes={exitingNotes}
        detectedNote={detectedNote}
        status={status}
        targetNote={targetNote}
        pressedKeys={pressedKeys}
        t={t}
        isMidiConnected={isMidiConnected}
        isChallengeActive={isChallengeActive}
        onPracticeRangeChange={onPracticeRangeChange}
      />
      <ChallengeProgress
        challengeSequence={challengeSequence}
        challengeIndex={challengeIndex}
        challengeInfo={challengeInfo}
      />
    </div>
  );
};

export default PracticeArea;
