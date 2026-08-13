import { Wand2 } from 'lucide-react';
import React, { useState } from 'react';

import { useGuidance } from '@sightplay/guidance';
import { usePractice } from '@sightplay/practice';

import { AiChatDrawer } from '../features/ai/AiChatDrawer';
import TopBar from '../features/controls/TopBar';
import { HintBubble } from '../features/hints/HintBubble';
import PracticeArea from '../features/practice/PracticeArea';
import { RecommendationPanel } from '../features/recommendations/RecommendationPanel';
import { translations } from '../i18n';
import { ClefType } from '../types';

type RandomPracticeViewProps = {
  t: typeof translations.en;
  toggleLang: () => void;
};

const PracticeMain: React.FC<{
  practice: ReturnType<typeof usePractice>;
  t: RandomPracticeViewProps['t'];
  guidance: ReturnType<typeof useGuidance>;
}> = ({ practice, t, guidance }) => {
  return (
    <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-3 sm:p-4">
      <div className="relative">
        <HintBubble hint={guidance.view.hint} t={t} onDismiss={guidance.dismissHint} />
        <PracticeArea
          view={practice.view}
          t={t}
          onPracticeRangeChange={practice.selectPracticeRange}
          onHandModeChange={practice.selectHandMode}
        />
      </div>
      <RecommendationPanel
        recommendations={guidance.view.recommendations}
        t={t}
        onApply={guidance.applyRecommendation}
        onDismiss={guidance.dismissRecommendation}
      />
    </main>
  );
};

export const RandomPracticeView: React.FC<RandomPracticeViewProps> = (props) => {
  const { t, toggleLang } = props;
  const practice = usePractice();
  const guidance = useGuidance();
  const { view } = practice;
  const [isChatOpen, setIsChatOpen] = useState(false);

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
      <PracticeMain practice={practice} t={t} guidance={guidance} />
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
      />
    </>
  );
};
