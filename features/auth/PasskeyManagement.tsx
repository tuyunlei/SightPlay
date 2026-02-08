import { KeyRound, Trash2, Plus, X } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useAuth } from './useAuth';

interface Passkey {
  id: string;
  name: string;
  createdAt: number;
}

interface PasskeyManagementProps {
  onClose: () => void;
}

export function PasskeyManagement({ onClose }: PasskeyManagementProps) {
  const { register, checkSession } = useAuth();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPasskeys = async () => {
    try {
      const response = await fetch('/api/auth/passkeys', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPasskeys(data);
      }
    } catch {
      // Error is already logged
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPasskeys();
  }, []);

  const handleAddPasskey = async () => {
    setIsAdding(true);
    setError(null);
    const success = await register();
    if (success) {
      await loadPasskeys();
    } else {
      setError('Failed to add passkey');
    }
    setIsAdding(false);
  };

  const handleRemovePasskey = async (id: string) => {
    if (passkeys.length === 1) {
      setError('Cannot remove the last passkey');
      return;
    }

    if (!confirm('Are you sure you want to remove this passkey?')) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/passkeys?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadPasskeys();
        await checkSession();
      } else {
        setError('Failed to remove passkey');
      }
    } catch {
      setError('Failed to remove passkey');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 p-6 shadow-2xl">
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

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
        )}

        <div className="mb-4 space-y-2">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">Loading...</div>
          ) : passkeys.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No passkeys found</div>
          ) : (
            passkeys.map((passkey) => (
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
                  onClick={() => handleRemovePasskey(passkey.id)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  disabled={passkeys.length === 1}
                  title={passkeys.length === 1 ? 'Cannot remove the last passkey' : 'Remove'}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={handleAddPasskey}
          disabled={isAdding}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 font-medium text-white transition-all hover:from-indigo-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAdding ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              Add Another Passkey
            </>
          )}
        </button>
      </div>
    </div>
  );
}
