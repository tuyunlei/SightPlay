import React, { useEffect, useRef, useState } from 'react';

import { useBrowserRoute } from './app/navigation/useBrowserRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewMode } from './components/navigation/NavigationTabs';
import { AuthGate } from './features/auth/AuthGate';
import { type AuthScene } from './features/auth/authScene';
import { useAiCoach } from './hooks/useAiCoach';
import { usePracticeSession } from './hooks/usePracticeSession';
import { useTestAPI } from './hooks/useTestAPI';
import { translations } from './i18n';
import { useUiStore } from './store/uiStore';
import { MainAppContent } from './views/MainAppContent';

function AuthenticatedApp() {
  const lang = useUiStore((state) => state.lang);
  const toggleLang = useUiStore((state) => state.toggleLang);
  const t = translations[lang];
  const [showPasskeyManagement, setShowPasskeyManagement] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('random');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [showSongComplete, setShowSongComplete] = useState(false);
  const challengeCompleteRef = useRef<() => void>(() => {});

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
      sendMessage(t.aiChallengeCompletedUserMessage);
    };
  }, [sendMessage, t.aiChallengeCompletedUserMessage]);

  return (
    <div
      className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col font-sans"
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
  );
}

const App = () => {
  const lang = useUiStore((state) => state.lang);
  const t = translations[lang];
  const { route, navigate } = useBrowserRoute();
  const authScene: AuthScene = route.kind === 'register' ? route : { kind: 'login' };

  if (
    (import.meta.env.MODE === 'test' || import.meta.env.DEV) &&
    window.localStorage.getItem('__sightplay_force_render_error') === '1'
  ) {
    throw new Error('E2E forced render error');
  }

  return (
    <ErrorBoundary t={t}>
      <AuthGate scene={authScene} navigate={navigate}>
        <AuthenticatedApp />
      </AuthGate>
    </ErrorBoundary>
  );
};

export default App;
