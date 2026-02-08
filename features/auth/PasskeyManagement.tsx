import { KeyRound, Trash2, Link as LinkIcon, X, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useAuthContext } from './AuthContext';

interface Passkey {
  id: string;
  name: string;
  createdAt: number;
}

interface PasskeyManagementProps {
  onClose: () => void;
}

function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-indigo-500/10 p-2">
          <KeyRound className="h-5 w-5 text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Manage Passkeys</h2>
      </div>
      <button
        onClick={onClose}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function InviteUrlDisplay({
  inviteUrl,
  copied,
  onCopy,
  onClose,
}: {
  inviteUrl: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-slate-700/50 p-4">
        <div className="mb-2 text-sm font-medium text-slate-300">Invite Link</div>
        <div className="mb-3 break-all rounded bg-slate-900/50 p-3 font-mono text-sm text-indigo-300">
          {inviteUrl}
        </div>
        <div className="mb-3 text-xs text-slate-400">Valid for 30 minutes • One-time use</div>
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600"
          >
            Close
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
  passkeys: Passkey[];
  isLoading: boolean;
  onRemove: (id: string) => void;
}) {
  if (isLoading) {
    return <div className="py-8 text-center text-slate-400">Loading...</div>;
  }

  if (passkeys.length === 0) {
    return <div className="py-8 text-center text-slate-400">No passkeys found</div>;
  }

  return (
    <>
      {passkeys.map((passkey) => (
        <div
          key={passkey.id}
          className="flex items-center justify-between rounded-lg bg-slate-700/50 p-4"
        >
          <div>
            <div className="font-medium text-white">{passkey.name}</div>
            <div className="text-sm text-slate-400">
              Added {new Date(passkey.createdAt).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={() => onRemove(passkey.id)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            disabled={passkeys.length === 1}
            title={passkeys.length === 1 ? 'Cannot remove the last passkey' : 'Remove'}
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
  return (
    <button
      onClick={onClick}
      disabled={isGenerating}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 font-medium text-white transition-all hover:from-indigo-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Generating...
        </>
      ) : (
        <>
          <LinkIcon className="h-5 w-5" />
          Generate Invite Link
        </>
      )}
    </button>
  );
}

async function loadPasskeysFromApi(): Promise<Passkey[]> {
  const response = await fetch('/api/auth/passkeys', { credentials: 'include' });
  if (response.ok) {
    return await response.json();
  }
  return [];
}

async function generateInviteToken(): Promise<string> {
  const response = await fetch('/api/auth/invite', {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to generate invite');
  const data = await response.json();
  return `${window.location.origin}/invite?token=${data.token}`;
}

async function deletePasskeyById(id: string): Promise<boolean> {
  const response = await fetch(`/api/auth/passkeys?id=${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return response.ok;
}

function usePasskeyManagementState() {
  const { checkSession } = useAuthContext();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPasskeysFromApi()
      .then(setPasskeys)
      .finally(() => setIsLoading(false));
  }, []);

  const handleGenerateInvite = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const url = await generateInviteToken();
      setInviteUrl(url);
    } catch {
      setError('Failed to generate invite link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyInvite = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemovePasskey = async (id: string) => {
    if (passkeys.length === 1) {
      setError('Cannot remove the last passkey');
      return;
    }
    if (!confirm('Are you sure you want to remove this passkey?')) return;

    const success = await deletePasskeyById(id);
    if (success) {
      const updatedPasskeys = await loadPasskeysFromApi();
      setPasskeys(updatedPasskeys);
      await checkSession();
    } else {
      setError('Failed to remove passkey');
    }
  };

  const handleCloseInvite = () => {
    setInviteUrl(null);
    setCopied(false);
  };

  return {
    passkeys,
    isLoading,
    isGenerating,
    inviteUrl,
    copied,
    error,
    handleGenerateInvite,
    handleCopyInvite,
    handleRemovePasskey,
    handleCloseInvite,
  };
}

export function PasskeyManagement({ onClose }: PasskeyManagementProps) {
  const {
    passkeys,
    isLoading,
    isGenerating,
    inviteUrl,
    copied,
    error,
    handleGenerateInvite,
    handleCopyInvite,
    handleRemovePasskey,
    handleCloseInvite,
  } = usePasskeyManagementState();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 p-6 shadow-2xl">
        <ModalHeader onClose={onClose} />

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
        )}

        <div className="mb-4 space-y-2">
          <PasskeyList passkeys={passkeys} isLoading={isLoading} onRemove={handleRemovePasskey} />
        </div>

        {inviteUrl ? (
          <InviteUrlDisplay
            inviteUrl={inviteUrl}
            copied={copied}
            onCopy={handleCopyInvite}
            onClose={handleCloseInvite}
          />
        ) : (
          <GenerateInviteButton isGenerating={isGenerating} onClick={handleGenerateInvite} />
        )}
      </div>
    </div>
  );
}
