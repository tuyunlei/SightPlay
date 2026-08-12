import { type ReactNode, useEffect, useMemo } from 'react';

import { selectAppScene, type AppRoute, type ProtectedAppRoute } from '@sightplay/app-shell';

import { translations } from '../../i18n';
import { useUiStore } from '../../store/uiStore';

import { AuthProvider } from './AuthProvider';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { useAuthContext } from './useAuthContext';

interface AuthGateInnerProps {
  children: (route: ProtectedAppRoute) => ReactNode;
  route: AppRoute;
  navigate: (route: AppRoute, replace?: boolean) => void;
}

function LoadingScene() {
  const lang = useUiStore((state) => state.lang);
  const t = translations[lang];

  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{
        backgroundImage:
          'linear-gradient(to bottom right, var(--color-bg-auth-from), var(--color-bg-auth-to))',
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-slate-600 dark:text-slate-400">{t.authLoading}</p>
      </div>
    </div>
  );
}

function AuthGateInner({ children, route, navigate }: AuthGateInnerProps) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const scene = useMemo(
    () =>
      selectAppScene(
        isLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'anonymous',
        route
      ),
    [isAuthenticated, isLoading, route]
  );

  useEffect(() => {
    if (scene.kind === 'redirect') navigate(scene.route, true);
  }, [navigate, scene]);

  if (scene.kind === 'booting' || scene.kind === 'redirect') return <LoadingScene />;

  if (scene.kind === 'anonymous') {
    if (scene.route.kind === 'register') {
      return (
        <RegisterScreen
          initialInviteCode={scene.route.inviteCode}
          onReturnToLogin={() => navigate({ kind: 'login' })}
        />
      );
    }

    return <LoginScreen onRegister={() => navigate({ kind: 'register' })} />;
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
    <AuthProvider>
      <AuthGateInner route={route} navigate={navigate}>
        {children}
      </AuthGateInner>
    </AuthProvider>
  );
}
