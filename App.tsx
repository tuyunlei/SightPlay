import React, { useCallback, useState } from 'react';

import { AccountAccessProvider } from '@sightplay/account-access-client';
import type { AppRoute, ProtectedAppRoute } from '@sightplay/app-shell';
import {
  createBrowserAccountAccessPorts,
  createBrowserGuidancePorts,
  createBrowserIdentityPorts,
  createBrowserPracticePorts,
} from '@sightplay/browser-adapters';
import { GuidanceProvider } from '@sightplay/guidance';
import { IdentityProvider, useIdentity } from '@sightplay/identity-client';
import { PracticeProvider, usePractice } from '@sightplay/practice';
import { PreferencesProvider, usePreferences } from '@sightplay/preferences';

import { GuidancePracticeBridge } from './app/guidance/GuidancePracticeBridge';
import { useBrowserRoute } from './app/navigation/useBrowserRoute';
import { createInitialRandomExercise } from './app/practice/createExercisePlan';
import { usePracticeRoute } from './app/practice/usePracticeRoute';
import { MainAppContent } from './app/presentation/MainAppContent';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGate } from './features/auth/AuthGate';
import { translations } from './i18n';

type Navigate = (route: AppRoute, replace?: boolean) => void;
type DismissEntry = (fallbackRoute: AppRoute) => void;

function AuthenticatedApp({
  route,
  navigate,
  dismissEntry,
}: {
  route: ProtectedAppRoute;
  navigate: Navigate;
  dismissEntry: DismissEntry;
}) {
  const identity = useIdentity();
  const [accountAccessPorts] = useState(createBrowserAccountAccessPorts);
  const [guidancePorts] = useState(createBrowserGuidancePorts);
  const [practicePorts] = useState(createBrowserPracticePorts);
  const [initialPlan] = useState(() => createInitialRandomExercise(practicePorts.seed.nextSeed()));
  const preferences = usePreferences();
  const lang = preferences.language;
  const toggleLang = preferences.toggleLanguage;
  const t = translations[lang];
  const content = (
    <GuidanceProvider
      ports={guidancePorts}
      initialContext={{ clef: initialPlan.config.clef, language: lang }}
    >
      <PracticeProvider ports={practicePorts} initialPlan={initialPlan}>
        <PracticeApplication
          route={route}
          navigate={navigate}
          dismissEntry={dismissEntry}
          t={t}
          lang={lang}
          toggleLang={toggleLang}
        />
      </PracticeProvider>
    </GuidanceProvider>
  );

  const handleAccountAccessOutput = useCallback(() => {
    identity.refreshSession();
  }, [identity]);

  return route.kind === 'passkeys' ? (
    <AccountAccessProvider ports={accountAccessPorts} onOutput={handleAccountAccessOutput}>
      {content}
    </AccountAccessProvider>
  ) : (
    content
  );
}

function PracticeApplication({
  route,
  navigate,
  dismissEntry,
  t,
  lang,
  toggleLang,
}: {
  route: ProtectedAppRoute;
  navigate: Navigate;
  dismissEntry: DismissEntry;
  t: (typeof translations)['en'];
  lang: ReturnType<typeof usePreferences>['language'];
  toggleLang: () => void;
}) {
  const practice = usePractice();
  usePracticeRoute(route, practice);

  return (
    <div
      className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col font-sans"
      style={{ minHeight: '100dvh' }}
    >
      <GuidancePracticeBridge language={lang} navigate={navigate} t={t} />
      <MainAppContent
        t={t}
        toggleLang={toggleLang}
        route={route}
        navigate={navigate}
        dismissEntry={dismissEntry}
      />
    </div>
  );
}

function AppRuntime() {
  const { route, navigate, dismissEntry } = useBrowserRoute();
  const [identityPorts] = useState(createBrowserIdentityPorts);

  if (
    (import.meta.env.MODE === 'test' || import.meta.env.DEV) &&
    window.localStorage.getItem('__sightplay_force_render_error') === '1'
  ) {
    throw new Error('E2E forced render error');
  }

  return (
    <IdentityProvider ports={identityPorts}>
      <AuthGate route={route} navigate={navigate}>
        {(protectedRoute) => (
          <AuthenticatedApp
            route={protectedRoute}
            navigate={navigate}
            dismissEntry={dismissEntry}
          />
        )}
      </AuthGate>
    </IdentityProvider>
  );
}

function LocalizedApp() {
  const { language } = usePreferences();
  const t = translations[language];

  return (
    <ErrorBoundary t={t}>
      <AppRuntime />
    </ErrorBoundary>
  );
}

const App = () => (
  <PreferencesProvider>
    <LocalizedApp />
  </PreferencesProvider>
);

export default App;
