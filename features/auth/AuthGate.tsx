import { type ReactNode } from 'react';

import { translations } from '../../i18n';
import { useUiStore } from '../../store/uiStore';

import { AuthProvider } from './AuthProvider';
import { type AuthScene } from './authScene';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { useAuthContext } from './useAuthContext';

interface AuthGateInnerProps {
  children: ReactNode;
  scene: AuthScene;
  navigate: (scene: AuthScene) => void;
}

function AuthGateInner({ children, scene, navigate }: AuthGateInnerProps) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const lang = useUiStore((state) => state.lang);
  const t = translations[lang];

  if (isLoading) {
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

  if (!isAuthenticated) {
    if (scene.kind === 'register') {
      return (
        <RegisterScreen
          initialInviteCode={scene.inviteCode}
          onReturnToLogin={() => navigate({ kind: 'login' })}
        />
      );
    }

    return <LoginScreen onRegister={() => navigate({ kind: 'register' })} />;
  }

  return <>{children}</>;
}

interface AuthGateProps {
  children: ReactNode;
  scene: AuthScene;
  navigate: (scene: AuthScene) => void;
}

export function AuthGate({ children, scene, navigate }: AuthGateProps) {
  return (
    <AuthProvider>
      <AuthGateInner scene={scene} navigate={navigate}>
        {children}
      </AuthGateInner>
    </AuthProvider>
  );
}
