import { Fingerprint } from 'lucide-react';
import { useMemo, useState } from 'react';

import { translations } from '../../i18n';
import { useUiStore } from '../../store/uiStore';
import { normalizeInviteCode, toDisplayInviteCode } from '../../utils/inviteCode';

import { useAuthContext } from './useAuthContext';

const MAX_INVITE_LENGTH = 8;

function formatInviteInput(raw: string): string {
  const normalized = normalizeInviteCode(raw).slice(0, MAX_INVITE_LENGTH);
  if (normalized.length <= 4) return normalized;
  return toDisplayInviteCode(normalized);
}

export function RegisterScreen() {
  const { register } = useAuthContext();
  const lang = useUiStore((state) => state.lang);
  const t = translations[lang];

  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInviteCodeComplete = useMemo(
    () => normalizeInviteCode(inviteCode).length === 8,
    [inviteCode]
  );

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
    <div
      data-testid="register-screen"
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-800/50 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="rounded-full bg-indigo-500/10 p-4">
            <Fingerprint className="h-12 w-12 text-indigo-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">{t.authRegisterTitle}</h1>
            <p className="mt-2 text-slate-400">{t.authRegisterSubtitle}</p>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="invite-code" className="mb-2 block text-sm font-medium text-slate-200">
            {t.authInviteCodeLabel}
          </label>
          <input
            id="invite-code"
            value={inviteCode}
            onChange={(event) => setInviteCode(formatInviteInput(event.target.value))}
            placeholder={t.authInviteCodePlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-3 font-mono tracking-widest text-white outline-none transition focus:border-indigo-400"
          />
        </div>

        <div className="mb-6 rounded-lg bg-slate-700/50 p-4">
          <h3 className="mb-2 font-medium text-white">{t.authPasskeyTitle}</h3>
          <p className="text-sm text-slate-300">{t.authPasskeyDesc}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleRegister}
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
    </div>
  );
}
