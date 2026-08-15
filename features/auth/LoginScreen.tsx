import { KeyRound } from 'lucide-react';

import { useIdentity } from '@sightplay/identity-client';

import { useLanguage } from '../../app/presentation/useLanguage';
import { translations } from '../../i18n';

import { AuthScreenLayout } from './AuthScreenLayout';
import { identityFailureMessage } from './identityFailureMessage';

interface LoginScreenProps {
  onRegister: () => void;
}

interface LoginCardProps {
  t: (typeof translations)['en'];
  isLoading: boolean;
  error: string | null;
  onLogin: () => void;
  onRegister: () => void;
}

function LoginCard({ t, isLoading, error, onLogin, onRegister }: LoginCardProps) {
  return (
    <div className="w-full rounded-2xl bg-white/90 p-8 shadow-2xl backdrop-blur-sm dark:bg-slate-800/50">
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="rounded-full bg-indigo-500/10 p-4">
          <KeyRound className="h-12 w-12 text-indigo-400" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.authLoginTitle}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{t.authLoginSubtitle}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={onLogin}
        disabled={isLoading}
        className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-medium text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {t.authLoginLoading}
          </span>
        ) : (
          t.authLoginButton
        )}
      </button>

      <button
        type="button"
        onClick={onRegister}
        className="mt-4 w-full text-center text-sm text-indigo-600 underline decoration-indigo-400/60 underline-offset-4 transition hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
      >
        {t.authNoAccountRegisterLink}
      </button>
    </div>
  );
}

export function LoginScreen({ onRegister }: LoginScreenProps) {
  const identity = useIdentity();
  const { t } = useLanguage();
  const isLoading = identity.view.operation === 'login';
  const error = identity.view.failure
    ? identityFailureMessage(t, identity.view.failure.code)
    : null;

  return (
    <AuthScreenLayout dataTestId="login-screen">
      <LoginCard
        t={t}
        isLoading={isLoading}
        error={error}
        onLogin={identity.login}
        onRegister={onRegister}
      />
    </AuthScreenLayout>
  );
}
