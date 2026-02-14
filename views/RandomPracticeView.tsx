import { Wand2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import type { Recommendation } from '../domain/recommendations';
import { AiChatDrawer } from '../features/ai/AiChatDrawer';
import TopBar from '../features/controls/TopBar';
import { HintBubble } from '../features/hints/HintBubble';
import PracticeArea from '../features/practice/PracticeArea';
import { RecommendationPanel } from '../features/recommendations/RecommendationPanel';
import { useContextualHints } from '../hooks/useContextualHints';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { useRecommendations } from '../hooks/useRecommendations';
import { Language, translations } from '../i18n';
import { usePracticeStore } from '../store/practiceStore';
import { ChatMessage } from '../types';

type RandomPracticeViewProps = {
  state: ReturnType<typeof usePracticeSession>['state'];
  derived: ReturnType<typeof usePracticeSession>['derived'];
  actions: ReturnType<typeof usePracticeSession>['actions'];
  pressedKeys: ReturnType<typeof usePracticeSession>['pressedKeys'];
  t: typeof translations.en;
  toggleLang: () => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  chatHistory: ChatMessage[];
  isLoadingAi: boolean;
  sendMessage: (message: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  lang: Language;
};

const usePracticeHints = (lang: Language, clef: string) => {
  const streak = usePracticeStore((s) => s.streak);
  const sessionStats = usePracticeStore((s) => s.sessionStats);
  const hints = useContextualHints(lang, clef);
  const prevAttempts = React.useRef(sessionStats.totalAttempts);

  useEffect(() => {
    if (sessionStats.totalAttempts > prevAttempts.current) {
      const hasMistake = sessionStats.totalAttempts > sessionStats.cleanHits;
      hints.onPracticeUpdate(streak, hasMistake);
    }
    prevAttempts.current = sessionStats.totalAttempts;
  }, [streak, sessionStats, hints]);

  return hints;
};

const PracticeMain: React.FC<{
  state: RandomPracticeViewProps['state'];
  derived: RandomPracticeViewProps['derived'];
  actions: RandomPracticeViewProps['actions'];
  pressedKeys: RandomPracticeViewProps['pressedKeys'];
  t: RandomPracticeViewProps['t'];
  lang: Language;
  recommendations: Recommendation[];
  dismissRec: (id: string) => void;
  applyRec: (rec: Recommendation) => void;
}> = ({ state, derived, actions, pressedKeys, t, lang, recommendations, dismissRec, applyRec }) => {
  const { currentHint, dismissHint } = usePracticeHints(lang, state.clef);

  return (
    <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-3 sm:p-4">
      <div className="relative">
        <HintBubble hint={currentHint} onDismiss={dismissHint} />
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
      </div>
      <RecommendationPanel
        recommendations={recommendations}
        t={t}
        onApply={applyRec}
        onDismiss={dismissRec}
      />
    </main>
  );
};

export const RandomPracticeView: React.FC<RandomPracticeViewProps> = (props) => {
  const { state, derived, actions, pressedKeys, t, toggleLang, lang } = props;
  const { chatInput, setChatInput, chatHistory, isLoadingAi, sendMessage, chatEndRef } = props;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { recommendations, dismiss, applyAction } = useRecommendations();

  const cbs = { toggleClef: actions.toggleClef, setPracticeRange: actions.setPracticeRange };
  const applyRec = (rec: Recommendation) => applyAction(rec, cbs);

  return (
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
      <PracticeMain
        state={state}
        derived={derived}
        actions={actions}
        pressedKeys={pressedKeys}
        t={t}
        lang={lang}
        recommendations={recommendations}
        dismissRec={dismiss}
        applyRec={applyRec}
      />
      <button
        onClick={() => setIsChatOpen(true)}
        data-testid="open-chat-button"
        className="fixed bottom-6 right-6 z-30 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-transform hover:scale-105"
        title={t.openAiChat}
      >
        <Wand2 size={20} />
      </button>
      <AiChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
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
    </>
  );
};
