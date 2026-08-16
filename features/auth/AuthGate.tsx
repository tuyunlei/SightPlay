import { type ReactNode, useEffect, useMemo } from 'react';

import { selectAppScene, type AppRoute, type ProtectedAppRoute } from '@sightplay/app-shell';
import { useIdentity } from '@sightplay/identity-client';

import { useLanguage } from '../../app/presentation/useLanguage';

import { identityFailureMessage } from './identityFailureMessage';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';

interface AuthGateInnerProps {
  children: (route: ProtectedAppRoute) => ReactNode;
  route: AppRoute;
  navigate: (route: AppRoute, replace?: boolean) => void;
}

function LoadingScene({
  failure,
  onRetry,
}: {
  failure: ReturnType<typeof useIdentity>['view']['failure'];
  onRetry: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{
        backgroundImage:
          'linear-gradient(to bottom right, var(--color-bg-auth-from), var(--color-bg-auth-to))',
      }}
    >
      <div className="flex flex-col items-center gap-4">
        {failure ? (
          <>
            <p className="text-slate-600 dark:text-slate-400">
              {identityFailureMessage(t, failure.code)}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
            >
              {t.authRetryButton}
            </button>
          </>
        ) : (
          <>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="text-slate-600 dark:text-slate-400">{t.authLoading}</p>
          </>
        )}
      </div>
    </div>
  );
}

function AuthGateInner({ children, route, navigate }: AuthGateInnerProps) {
  const identity = useIdentity();
  const scene = useMemo(
    () =>
      selectAppScene(
        {
          status: identity.view.status === 'booting' ? 'loading' : identity.view.status,
          hasPasskeys: identity.view.hasPasskeys,
        },
        route
      ),
    [identity.view.hasPasskeys, identity.view.status, route]
  );

  useEffect(() => {
    if (scene.kind === 'redirect') navigate(scene.route, true);
  }, [navigate, scene]);

  if (scene.kind === 'booting' || scene.kind === 'redirect') {
    return (
      <LoadingScene failure={identity.view.failure} onRetry={() => identity.refreshSession()} />
    );
  }

  if (scene.kind === 'anonymous') {
    if (scene.route.kind === 'register') {
      return (
        <RegisterScreen
          initialInviteCode={scene.route.inviteCode}
          onReturnToLogin={
            identity.view.hasPasskeys
              ? () => {
                  identity.clearFailure();
                  navigate({ kind: 'login' });
                }
              : undefined
          }
        />
      );
    }

    return (
      <LoginScreen
        onRegister={() => {
          identity.clearFailure();
          navigate({ kind: 'register' });
        }}
      />
    );
  }

  return <>{children(scene.route)}</>;
}

interface AuthGateProps {
  children: (route: ProtectedAppRoute) => ReactNode;
  route: AppRoute;
  navigate: (route: AppRoute, replace?: boolean) => void;
}

export function AuthGate({ children, route, navigate }: AuthGateProps) {
  return (
    <AuthGateInner route={route} navigate={navigate}>
      {children}
    </AuthGateInner>
  );
}
