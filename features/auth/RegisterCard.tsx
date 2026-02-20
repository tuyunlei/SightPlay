import { Fingerprint } from 'lucide-react';
import { useState } from 'react';

import { translations } from '../../i18n';
import { useUiStore } from '../../store/uiStore';
import { normalizeInviteCode, toDisplayInviteCode } from '../../utils/inviteCode';

import { useAuthContext } from './useAuthContext';

const MAX_INVITE_LENGTH = 8;

function formatInviteInput(raw: string): string {
  const normalized = normalizeInviteCode(raw).slice(0, MAX_INVITE_LENGTH);
  return normalized.length <= 4 ? normalized : toDisplayInviteCode(normalized);
}

interface RegisterCardProps {
  initialInviteCode?: string;
  highlighted?: boolean;
  dataTestId?: string;
}

interface RegisterCardViewProps {
  t: (typeof translations)['en'];
  inviteCode: string;
  isLoading: boolean;
  isInviteCodeComplete: boolean;
  error: string | null;
  dataTestId?: string;
  highlighted: boolean;
  onInviteCodeChange: (value: string) => void;
  onRegister: () => void;
}

function RegisterCardView({
  t,
  inviteCode,
  isLoading,
  isInviteCodeComplete,
  error,
  dataTestId,
  highlighted,
  onInviteCodeChange,
  onRegister,
}: RegisterCardViewProps) {
  return (
    <div
      data-testid={dataTestId}
      className={`w-full rounded-2xl bg-white/90 p-8 shadow-2xl backdrop-blur-sm transition-all dark:bg-slate-800/50 ${highlighted ? 'ring-2 ring-indigo-400/80 shadow-indigo-500/30' : ''}`}
    >
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="rounded-full bg-indigo-500/10 p-4">
          <Fingerprint className="h-12 w-12 text-indigo-400" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t.authRegisterTitle}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{t.authRegisterSubtitle}</p>
        </div>
      </div>

      <div className="mb-4">
        <label
          htmlFor="invite-code"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {t.authInviteCodeLabel}
        </label>
        <input
          id="invite-code"
          value={inviteCode}
          onChange={(event) => onInviteCodeChange(event.target.value)}
          placeholder={t.authInviteCodePlaceholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono tracking-widest text-slate-900 outline-none transition focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900/60 dark:text-white"
        />
      </div>

      <div className="mb-6 rounded-lg bg-slate-100 p-4 dark:bg-slate-700/50">
        <h3 className="mb-2 font-medium text-slate-900 dark:text-white">{t.authPasskeyTitle}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t.authPasskeyDesc}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={onRegister}
        disabled={isLoading || !isInviteCodeComplete}
        className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-medium text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {t.authRegisterLoading}
          </span>
        ) : (
          t.authRegisterButton
        )}
      </button>
    </div>
  );
}

export function RegisterCard({
  initialInviteCode,
  highlighted = false,
  dataTestId,
}: RegisterCardProps) {
  const { register } = useAuthContext();
  const lang = useUiStore((state) => state.lang);
  const t = translations[lang];

  const [inviteCode, setInviteCode] = useState(() =>
    initialInviteCode ? formatInviteInput(initialInviteCode) : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInviteCodeComplete = normalizeInviteCode(inviteCode).length === 8;

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);
    const result = await register(undefined, inviteCode);
    if (result !== true) {
      setError(result);
      setIsLoading(false);
    }
  };

  return (
    <RegisterCardView
      t={t}
      inviteCode={inviteCode}
      isLoading={isLoading}
      isInviteCodeComplete={isInviteCodeComplete}
      error={error}
      dataTestId={dataTestId}
      highlighted={highlighted}
      onInviteCodeChange={(value) => setInviteCode(formatInviteInput(value))}
      onRegister={handleRegister}
    />
  );
}
