import React, { useEffect, useRef } from 'react';

import type { AppRoute, ProtectedAppRoute } from '@sightplay/app-shell';

import { useBrowserRoute } from './app/navigation/useBrowserRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGate } from './features/auth/AuthGate';
import { useAiCoach } from './hooks/useAiCoach';
import { usePracticeSession } from './hooks/usePracticeSession';
import { useTestAPI } from './hooks/useTestAPI';
import { translations } from './i18n';
import { useUiStore } from './store/uiStore';
import { MainAppContent } from './views/MainAppContent';

type Navigate = (route: AppRoute, replace?: boolean) => void;

function AuthenticatedApp({ route, navigate }: { route: ProtectedAppRoute; navigate: Navigate }) {
  const lang = useUiStore((state) => state.lang);
  const toggleLang = useUiStore((state) => state.toggleLang);
  const t = translations[lang];
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
        route={route}
        navigate={navigate}
      />
    </div>
  );
}

function AppRuntime() {
  const { route, navigate } = useBrowserRoute();

  if (
    (import.meta.env.MODE === 'test' || import.meta.env.DEV) &&
    window.localStorage.getItem('__sightplay_force_render_error') === '1'
  ) {
    throw new Error('E2E forced render error');
  }

  return (
    <AuthGate route={route} navigate={navigate}>
      {(protectedRoute) => <AuthenticatedApp route={protectedRoute} navigate={navigate} />}
    </AuthGate>
  );
}

const App = () => {
  const lang = useUiStore((state) => state.lang);
  const t = translations[lang];

  return (
    <ErrorBoundary t={t}>
      <AppRuntime />
    </ErrorBoundary>
  );
};

export default App;
