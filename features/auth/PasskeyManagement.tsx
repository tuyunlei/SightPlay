import { Check, Copy, KeyRound, Ticket, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { useAccountAccess } from '@sightplay/account-access-client';
import type { CredentialSummary } from '@sightplay/account-access-client';
import { useIdentity } from '@sightplay/identity-client';

import { useLanguage } from '../../app/presentation/useLanguage';

import { InvitationCliAccess } from './InvitationCliAccess';

interface PasskeyManagementProps {
  onClose: () => void;
}

function ModalHeader({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-indigo-500/10 p-2">
          <KeyRound className="h-5 w-5 text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.passkeyManageTitle}</h2>
      </div>
      <button
        onClick={onClose}
        className="rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-900 active:scale-90 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
        aria-label={t.passkeyClose}
        title={t.passkeyClose}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
function InviteCodeDisplay({
  inviteCode,
  copied,
  onCopy,
  onClose,
}: {
  inviteCode: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-700/50">
        <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          {t.inviteCodeLabel}
        </div>
        <div className="mb-3 rounded bg-slate-200 p-3 text-center font-mono text-xl tracking-widest text-indigo-700 dark:bg-slate-900/50 dark:text-indigo-300">
          {inviteCode}
        </div>
        <div className="mb-3 text-xs text-slate-600 dark:text-slate-400">
          {t.inviteCodeValidFor}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-600 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                {t.inviteCodeCopied}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                {t.inviteCodeCopy}
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition-all hover:bg-slate-300 active:scale-95 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
          >
            {t.passkeyClose}
          </button>
        </div>
      </div>
    </div>
  );
}
function PasskeyList({
  passkeys,
  isLoading,
  onRemove,
}: {
  passkeys: readonly CredentialSummary[];
  isLoading: boolean;
  onRemove: (id: string) => void;
}) {
  const { t } = useLanguage();

  if (isLoading)
    return (
      <div className="py-8 text-center text-slate-600 dark:text-slate-400">{t.passkeyLoading}</div>
    );
  if (passkeys.length === 0)
    return (
      <div className="py-8 text-center text-slate-600 dark:text-slate-400">{t.passkeyEmpty}</div>
    );

  return (
    <>
      {passkeys.map((passkey) => (
        <div
          key={passkey.id}
          className="flex items-center justify-between rounded-lg bg-slate-100 p-4 dark:bg-slate-700/50"
        >
          <div>
            <div className="font-medium text-slate-900 dark:text-white">{passkey.name}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {t.passkeyAdded} {new Date(passkey.createdAt).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={() => onRemove(passkey.id)}
            className="rounded-lg p-2 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-500 active:scale-90 disabled:opacity-30 dark:text-slate-400 dark:hover:text-red-400"
            disabled={passkeys.length === 1}
            title={passkeys.length === 1 ? t.passkeyCannotRemoveLast : t.passkeyRemove}
            aria-label={passkeys.length === 1 ? t.passkeyCannotRemoveLast : t.passkeyRemove}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      ))}
    </>
  );
}
function GenerateInviteButton({
  isGenerating,
  onClick,
}: {
  isGenerating: boolean;
  onClick: () => void;
}) {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      disabled={isGenerating}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 font-medium text-white transition-all hover:from-indigo-600 hover:to-purple-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          {t.inviteCodeGenerating}
        </>
      ) : (
        <>
          <Ticket className="h-5 w-5" />
          {t.inviteCodeGenerate}
        </>
      )}
    </button>
  );
}

function usePasskeyPresentationState() {
  const accountAccess = useAccountAccess();
  const [copied, setCopied] = useState(false);
  const [cliCopied, setCliCopied] = useState(false);
  const { t } = useLanguage();

  const handleGenerateInvite = () => {
    accountAccess.clearFailure();
    accountAccess.requestInvitation();
  };

  const handleCopyInvite = () => {
    if (!accountAccess.state.invitationCode) return;
    void navigator.clipboard.writeText(accountAccess.state.invitationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemovePasskey = (id: string) => {
    if (accountAccess.state.credentials.length === 1) return;
    if (!confirm(t.passkeyRemoveConfirm)) return;
    accountAccess.requestCredentialRevocation(id);
  };

  const handleCreateInvitationAccess = () => {
    if (accountAccess.state.invitationAccess && !confirm(t.inviteCliReplaceConfirm)) return;
    accountAccess.requestInvitationAccess();
  };

  const handleCopyInvitationAccess = () => {
    if (!accountAccess.state.invitationAccessToken) return;
    void navigator.clipboard.writeText(accountAccess.state.invitationAccessToken);
    setCliCopied(true);
    setTimeout(() => setCliCopied(false), 2000);
  };

  const handleRevokeInvitationAccess = () => {
    if (!confirm(t.inviteCliRevokeConfirm)) return;
    accountAccess.requestInvitationAccessRevocation();
  };

  const failure = accountAccess.state.failure;
  const error = failure
    ? failure.code === 'invitationRejected'
      ? t.inviteCodeFailed
      : failure.code === 'invitationAccessRejected'
        ? t.inviteCliFailed
        : t.passkeyRemoveFailed
    : null;

  return {
    passkeys: accountAccess.state.credentials,
    isLoading: !accountAccess.state.loaded,
    isGenerating: accountAccess.state.operation?.kind === 'creatingInvitation',
    inviteCode: accountAccess.state.invitationCode,
    copied,
    cliCopied,
    invitationAccess: accountAccess.state.invitationAccess,
    invitationAccessToken: accountAccess.state.invitationAccessToken,
    isInvitationAccessBusy:
      accountAccess.state.operation?.kind === 'creatingInvitationAccess' ||
      accountAccess.state.operation?.kind === 'revokingInvitationAccess',
    error,
    handleGenerateInvite,
    handleCopyInvite,
    handleRemovePasskey,
    handleCreateInvitationAccess,
    handleCopyInvitationAccess,
    handleRevokeInvitationAccess,
    handleDismissInvitationAccess: () => {
      accountAccess.dismissInvitationAccessToken();
      setCliCopied(false);
    },
    handleCloseInvite: () => {
      accountAccess.dismissInvitation();
      setCopied(false);
    },
  };
}
export function PasskeyManagement({ onClose }: PasskeyManagementProps) {
  const { logout } = useIdentity();
  const {
    passkeys,
    isLoading,
    isGenerating,
    inviteCode,
    copied,
    cliCopied,
    invitationAccess,
    invitationAccessToken,
    isInvitationAccessBusy,
    error,
    handleGenerateInvite,
    handleCopyInvite,
    handleRemovePasskey,
    handleCreateInvitationAccess,
    handleCopyInvitationAccess,
    handleRevokeInvitationAccess,
    handleDismissInvitationAccess,
    handleCloseInvite,
  } = usePasskeyPresentationState();
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-overlay)] p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
        <ModalHeader onClose={onClose} />

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
        )}

        <div className="mb-4 space-y-2">
          <PasskeyList passkeys={passkeys} isLoading={isLoading} onRemove={handleRemovePasskey} />
        </div>

        <InvitationCliAccess
          expiresAt={invitationAccess?.expiresAt ?? null}
          token={invitationAccessToken}
          busy={isInvitationAccessBusy}
          copied={cliCopied}
          onCreate={handleCreateInvitationAccess}
          onCopy={handleCopyInvitationAccess}
          onDismiss={handleDismissInvitationAccess}
          onRevoke={handleRevokeInvitationAccess}
        />

        {inviteCode ? (
          <InviteCodeDisplay
            inviteCode={inviteCode}
            copied={copied}
            onCopy={handleCopyInvite}
            onClose={handleCloseInvite}
          />
        ) : (
          <GenerateInviteButton isGenerating={isGenerating} onClick={handleGenerateInvite} />
        )}

        <button
          type="button"
          onClick={logout}
          className="mt-3 w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50 active:scale-95 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          {t.authLogoutButton}
        </button>
      </div>
    </div>
  );
}
