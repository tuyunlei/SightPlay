import React from 'react';

import AiCoachPanel from '../features/ai/AiCoachPanel';
import TopBar from '../features/controls/TopBar';
import PracticeArea from '../features/practice/PracticeArea';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { translations } from '../i18n';

type RandomPracticeViewProps = {
  state: ReturnType<typeof usePracticeSession>['state'];
  derived: ReturnType<typeof usePracticeSession>['derived'];
  actions: ReturnType<typeof usePracticeSession>['actions'];
  pressedKeys: ReturnType<typeof usePracticeSession>['pressedKeys'];
  t: typeof translations.en;
  toggleLang: () => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  chatHistory: Array<{ role: 'user' | 'ai'; text: string; hasAction?: boolean }>;
  isLoadingAi: boolean;
  sendMessage: (message: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
};

export const RandomPracticeView: React.FC<RandomPracticeViewProps> = ({
  state,
  derived,
  actions,
  pressedKeys,
  t,
  toggleLang,
  chatInput,
  setChatInput,
  chatHistory,
  isLoadingAi,
  sendMessage,
  chatEndRef,
}) => (
  <>
    <TopBar
      isListening={state.isListening}
      clef={state.clef}
      score={state.score}
      bpm={state.sessionStats.bpm}
      accuracy={derived.accuracy}
      onToggleMic={actions.toggleMic}
      onToggleClef={actions.toggleClef}
      onToggleLang={toggleLang}
      onResetStats={actions.resetSessionStats}
      t={t}
    />
    <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-3 sm:p-4 gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-3">
      <PracticeArea
        clef={state.clef}
        practiceRange={state.practiceRange}
        handMode={state.handMode}
        noteQueue={state.noteQueue}
        exitingNotes={state.exitingNotes}
        detectedNote={state.detectedNote}
        status={state.status}
        targetNote={derived.targetNote}
        pressedKeys={pressedKeys}
        challengeSequence={state.challengeSequence}
        challengeIndex={state.challengeIndex}
        challengeInfo={state.challengeInfo}
        t={t}
        isMidiConnected={state.isMidiConnected}
        onPracticeRangeChange={actions.setPracticeRange}
        onHandModeChange={actions.setHandMode}
      />
      <AiCoachPanel
        clef={state.clef}
        targetNote={derived.targetNote}
        t={t}
        chatHistory={chatHistory}
        chatInput={chatInput}
        isLoadingAi={isLoadingAi}
        onChatInputChange={setChatInput}
        onSendMessage={sendMessage}
        chatEndRef={chatEndRef}
      />
    </main>
  </>
);
