import { Wand2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import type { AppContentRoute } from '@sightplay/app-shell';
import { type PracticeClient, type PracticeView, usePractice } from '@sightplay/practice';

import { applyRecommendationAction } from '../app/recommendations/applyRecommendationAction';
import type { Recommendation } from '../domain/recommendations';
import { AiChatDrawer } from '../features/ai/AiChatDrawer';
import TopBar from '../features/controls/TopBar';
import { HintBubble } from '../features/hints/HintBubble';
import PracticeArea from '../features/practice/PracticeArea';
import { RecommendationPanel } from '../features/recommendations/RecommendationPanel';
import { useContextualHints } from '../hooks/useContextualHints';
import { useRecommendations } from '../hooks/useRecommendations';
import { Language, translations } from '../i18n';
import { ChatMessage, ClefType } from '../types';

type RandomPracticeViewProps = {
  t: typeof translations.en;
  toggleLang: () => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  chatHistory: ChatMessage[];
  isLoadingAi: boolean;
  sendMessage: (message: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  lang: Language;
  navigate: (route: AppContentRoute) => void;
};

const usePracticeHints = (lang: Language, view: PracticeView) => {
  const hints = useContextualHints(lang, view.clef);
  const prevAttempts = React.useRef(view.sessionStats.totalAttempts);

  useEffect(() => {
    if (view.sessionStats.totalAttempts > prevAttempts.current) {
      const hasMistake = view.sessionStats.totalAttempts > view.sessionStats.cleanHits;
      hints.onPracticeUpdate(view.streak, hasMistake);
    }
    prevAttempts.current = view.sessionStats.totalAttempts;
  }, [view.sessionStats, view.streak, hints]);

  return hints;
};

const PracticeMain: React.FC<{
  practice: PracticeClient;
  t: RandomPracticeViewProps['t'];
  lang: Language;
  recommendations: Recommendation[];
  dismissRec: (id: string) => void;
  applyRec: (rec: Recommendation) => void;
}> = ({ practice, t, lang, recommendations, dismissRec, applyRec }) => {
  const { currentHint, dismissHint } = usePracticeHints(lang, practice.view);

  return (
    <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-3 sm:p-4">
      <div className="relative">
        <HintBubble hint={currentHint} onDismiss={dismissHint} />
        <PracticeArea
          view={practice.view}
          t={t}
          onPracticeRangeChange={practice.selectPracticeRange}
          onHandModeChange={practice.selectHandMode}
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
  const { t, toggleLang, lang } = props;
  const practice = usePractice();
  const { view } = practice;
  const { chatInput, setChatInput, chatHistory, isLoadingAi, sendMessage, chatEndRef } = props;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { recommendations, dismiss } = useRecommendations(view);

  const applyRec = (rec: Recommendation) => {
    if (!rec.action) return;
    applyRecommendationAction(rec.action, {
      selectClef: (clef) => practice.selectClef(clef === ClefType.TREBLE ? 'treble' : 'bass'),
      setPracticeRange: practice.selectPracticeRange,
      navigate: props.navigate,
    });
    dismiss();
  };

  return (
    <>
      <TopBar
        isListening={view.isListening}
        clef={view.clef === 'treble' ? ClefType.TREBLE : ClefType.BASS}
        score={view.score}
        bpm={view.sessionStats.bpm}
        accuracy={view.accuracy}
        onToggleMic={practice.toggleMicrophone}
        onToggleClef={() => practice.selectClef(view.clef === 'treble' ? 'bass' : 'treble')}
        onToggleLang={toggleLang}
        onResetStats={practice.resetStats}
        t={t}
      />
      <PracticeMain
        practice={practice}
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
        clef={view.clef === 'treble' ? ClefType.TREBLE : ClefType.BASS}
        targetNote={view.targetNote}
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
