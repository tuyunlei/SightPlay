import React, { useEffect, useRef } from 'react';

import AiCoachPanel from './features/ai/AiCoachPanel';
import TopBar from './features/controls/TopBar';
import PracticeArea from './features/practice/PracticeArea';
import { useAiCoach } from './hooks/useAiCoach';
import { usePracticeSession } from './hooks/usePracticeSession';
import { translations } from './i18n';
import { useUiStore } from './store/uiStore';

const App = () => {
  const lang = useUiStore((state) => state.lang);
  const toggleLang = useUiStore((state) => state.toggleLang);
  const t = translations[lang];

  const challengeCompleteRef = useRef<() => void>(() => {});

  const { state, derived, actions, pressedKeys } = usePracticeSession({
    onMicError: () => alert(t.micError),
    onChallengeComplete: () => challengeCompleteRef.current(),
  });

  const { chatInput, setChatInput, chatHistory, isLoadingAi, sendMessage, chatEndRef } = useAiCoach(
    {
      clef: state.clef,
      lang,
      onLoadChallenge: actions.loadChallenge,
      onMissingApiKey: () => alert(t.apiKeyError),
    }
  );

  useEffect(() => {
    challengeCompleteRef.current = () => {
      sendMessage('I finished the challenge! How did I do?');
    };
  }, [sendMessage]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl" />
      </div>

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

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-4 gap-6 grid grid-cols-1 lg:grid-cols-3">
        <PracticeArea
          clef={state.clef}
          practiceRange={state.practiceRange}
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
    </div>
  );
};

export default App;
