import React from 'react';

import type { AppContentRoute, AppRoute, ProtectedAppRoute } from '@sightplay/app-shell';

import { BackgroundDecor } from '../../components/layout/BackgroundDecor';
import { PasskeyButton } from '../../components/layout/PasskeyButton';
import { NavigationTabs } from '../../components/navigation/NavigationTabs';
import { PasskeyManagement } from '../../features/auth/PasskeyManagement';
import { translations } from '../../i18n';

import { ContentView } from './ContentView';

type MainAppContentProps = {
  t: typeof translations.en;
  toggleLang: () => void;
  route: ProtectedAppRoute;
  navigate: (route: AppRoute, replace?: boolean) => void;
  dismissEntry: (fallbackRoute: AppRoute) => void;
};

export const MainAppContent: React.FC<MainAppContentProps> = (props) => {
  const contentRoute: AppContentRoute =
    props.route.kind === 'passkeys' ? (props.route.returnTo ?? { kind: 'course' }) : props.route;

  const openPasskeys = () => {
    if (props.route.kind === 'passkeys') return;
    props.navigate({ kind: 'passkeys', returnTo: props.route });
  };

  const closePasskeys = () => {
    if (props.route.kind !== 'passkeys') return;
    props.dismissEntry(props.route.returnTo ?? { kind: 'course' });
  };

  return (
    <>
      <BackgroundDecor />
      {props.route.kind !== 'passkeys' && <PasskeyButton onClick={openPasskeys} />}
      {props.route.kind === 'passkeys' && <PasskeyManagement onClose={closePasskeys} />}
      {(props.route.kind === 'course' ||
        props.route.kind === 'randomPractice' ||
        props.route.kind === 'library') && (
        <NavigationTabs
          activeRoute={props.route.kind}
          onNavigate={(kind) => props.navigate({ kind })}
          onToggleLang={props.toggleLang}
          t={props.t}
        />
      )}
      <ContentView {...props} route={contentRoute} dismissEntry={props.dismissEntry} />
    </>
  );
};
