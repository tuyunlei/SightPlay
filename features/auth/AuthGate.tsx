import { type ReactNode } from 'react';

import { translations } from '../../i18n';
import { useUiStore } from '../../store/uiStore';

import { AuthProvider } from './AuthProvider';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { useAuthContext } from './useAuthContext';

interface AuthGateInnerProps {
  children: ReactNode;
  initialAuthView?: 'login' | 'register';
  initialInviteCode?: string;
}

function AuthGateInner({ children, initialAuthView, initialInviteCode }: AuthGateInnerProps) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const lang = useUiStore((state) => state.lang);
  const t = translations[lang];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-slate-400">{t.authLoading}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (initialAuthView === 'register') {
      return <RegisterScreen initialInviteCode={initialInviteCode} />;
    }

    return <LoginScreen initialInviteCode={initialInviteCode} />;
  }

  return <>{children}</>;
}

interface AuthGateProps {
  children: ReactNode;
  initialAuthView?: 'login' | 'register';
  initialInviteCode?: string;
}

export function AuthGate({ children, initialAuthView, initialInviteCode }: AuthGateProps) {
  return (
    <AuthProvider>
      <AuthGateInner initialAuthView={initialAuthView} initialInviteCode={initialInviteCode}>
        {children}
      </AuthGateInner>
    </AuthProvider>
  );
}
