import React, { useEffect, useRef, useState } from 'react';

import { ViewMode } from './components/navigation/NavigationTabs';
import { AuthGate } from './features/auth/AuthGate';
import { useAiCoach } from './hooks/useAiCoach';
import { usePracticeSession } from './hooks/usePracticeSession';
import { useTestAPI } from './hooks/useTestAPI';
import { translations } from './i18n';
import { useUiStore } from './store/uiStore';
import { MainAppContent } from './views/MainAppContent';

const App = () => {
  const lang = useUiStore((state) => state.lang);
  const toggleLang = useUiStore((state) => state.toggleLang);
  const t = translations[lang];
  const [showPasskeyManagement, setShowPasskeyManagement] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('random');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [showSongComplete, setShowSongComplete] = useState(false);
  const challengeCompleteRef = useRef<() => void>(() => {});

  const pathname = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const initialAuthView = pathname === '/register' ? 'register' : 'login';
  const inviteCodeFromUrl = urlParams.get('code') ?? undefined;

  const practiceSession = usePracticeSession({
    onMicError: () => alert(t.micError),
    onChallengeComplete: () => challengeCompleteRef.current(),
  });

  const { state, derived, actions, pressedKeys } = practiceSession;
  useTestAPI(practiceSession);

  const { chatInput, setChatInput, chatHistory, isLoadingAi, sendMessage, chatEndRef } = useAiCoach(
    {
      clef: state.clef,
      lang,
      onLoadChallenge: actions.loadChallenge,
    }
  );

  useEffect(() => {
    challengeCompleteRef.current = () => {
      sendMessage('I finished the challenge! How did I do?');
    };
  }, [sendMessage]);

  return (
    <AuthGate initialAuthView={initialAuthView} initialInviteCode={inviteCodeFromUrl}>
      <div
        className="bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100"
        style={{ minHeight: '100dvh' }}
      >
        <MainAppContent
          state={state}
          derived={derived}
          actions={actions}
          pressedKeys={pressedKeys}
          t={t}
          toggleLang={toggleLang}
          chatInput={chatInput}
          setChatInput={setChatInput}
          chatHistory={chatHistory}
          isLoadingAi={isLoadingAi}
          sendMessage={sendMessage}
          chatEndRef={chatEndRef}
          lang={lang}
          showPasskeyManagement={showPasskeyManagement}
          setShowPasskeyManagement={setShowPasskeyManagement}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedSongId={selectedSongId}
          setSelectedSongId={setSelectedSongId}
          showSongComplete={showSongComplete}
          setShowSongComplete={setShowSongComplete}
        />
      </div>
    </AuthGate>
  );
};

export default App;
