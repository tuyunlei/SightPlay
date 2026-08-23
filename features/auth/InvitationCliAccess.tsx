import { Check, Copy, ShieldCheck, Terminal } from 'lucide-react';

import { useLanguage } from '../../app/presentation/useLanguage';

interface InvitationCliAccessProps {
  readonly expiresAt: number | null;
  readonly token: string | null;
  readonly busy: boolean;
  readonly copied: boolean;
  readonly onCreate: () => void;
  readonly onCopy: () => void;
  readonly onDismiss: () => void;
  readonly onRevoke: () => void;
}

function IssuedToken({
  token,
  copied,
  onCopy,
  onDismiss,
}: Pick<InvitationCliAccessProps, 'token' | 'copied' | 'onCopy' | 'onDismiss'>) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        {t.inviteCliTokenOnce}
      </div>
      <div className="break-all rounded bg-slate-100 p-3 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">
        {token}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCopy}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t.inviteCliCopied : t.inviteCliCopy}
        </button>
        <button
          onClick={onDismiss}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-white"
        >
          {t.inviteCliDone}
        </button>
      </div>
    </div>
  );
}

function CredentialControls({
  expiresAt,
  busy,
  onCreate,
  onRevoke,
}: Pick<InvitationCliAccessProps, 'expiresAt' | 'busy' | 'onCreate' | 'onRevoke'>) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      {expiresAt && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          {t.inviteCliActive.replace('{date}', new Date(expiresAt).toLocaleDateString())}
        </div>
      )}
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={onCreate}
          className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {expiresAt ? t.inviteCliReplace : t.inviteCliCreate}
        </button>
        {expiresAt && (
          <button
            disabled={busy}
            onClick={onRevoke}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400"
          >
            {t.inviteCliRevoke}
          </button>
        )}
      </div>
    </div>
  );
}

export function InvitationCliAccess(props: InvitationCliAccessProps) {
  const { t } = useLanguage();
  return (
    <section className="mb-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
        <Terminal className="h-4 w-4 text-indigo-500" />
        {t.inviteCliTitle}
      </div>
      <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">{t.inviteCliDescription}</p>
      {props.token ? <IssuedToken {...props} /> : <CredentialControls {...props} />}
    </section>
  );
}
