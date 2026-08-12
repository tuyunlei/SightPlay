import React from 'react';

import type { AppContentRoute, AppRoute, ProtectedAppRoute } from '@sightplay/app-shell';

import { BackgroundDecor } from '../components/layout/BackgroundDecor';
import { PasskeyButton } from '../components/layout/PasskeyButton';
import { NavigationTabs } from '../components/navigation/NavigationTabs';
import { PasskeyManagement } from '../features/auth/PasskeyManagement';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { Language, translations } from '../i18n';

import { ContentView } from './ContentView';

type MainAppContentProps = {
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
  lang: Language;
  route: ProtectedAppRoute;
  navigate: (route: AppRoute, replace?: boolean) => void;
  dismissEntry: (fallbackRoute: AppRoute) => void;
};

export const MainAppContent: React.FC<MainAppContentProps> = (props) => {
  const contentRoute: AppContentRoute =
    props.route.kind === 'passkeys'
      ? (props.route.returnTo ?? { kind: 'randomPractice' })
      : props.route;

  const openPasskeys = () => {
    if (props.route.kind === 'passkeys') return;
    props.navigate({ kind: 'passkeys', returnTo: props.route });
  };

  const closePasskeys = () => {
    if (props.route.kind !== 'passkeys') return;
    props.dismissEntry(props.route.returnTo ?? { kind: 'randomPractice' });
  };

  return (
    <>
      <BackgroundDecor />
      {props.route.kind !== 'passkeys' && <PasskeyButton onClick={openPasskeys} />}
      {props.route.kind === 'passkeys' && <PasskeyManagement onClose={closePasskeys} />}
      {(props.route.kind === 'randomPractice' || props.route.kind === 'library') && (
        <NavigationTabs
          activeRoute={props.route.kind}
          onNavigate={(kind) => props.navigate({ kind })}
          t={props.t}
        />
      )}
      <ContentView {...props} route={contentRoute} dismissEntry={props.dismissEntry} />
    </>
  );
};
