import { Fingerprint } from 'lucide-react';
import { useState } from 'react';

import { useAuthContext } from './useAuthContext';

export function RegisterScreen() {
  const { register } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);

    const success = await register();

    if (!success) {
      setError('Registration failed. Please try again.');
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
            <h1 className="text-2xl font-bold text-white">Welcome to SightPlay</h1>
            <p className="mt-2 text-slate-400">Set up your passkey to get started</p>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-slate-700/50 p-4">
          <h3 className="mb-2 font-medium text-white">What's a passkey?</h3>
          <p className="text-sm text-slate-300">
            Passkeys use your device's biometric authentication (Face ID, Touch ID, or Windows
            Hello) to securely sign you in. No passwords needed!
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={isLoading}
          className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-medium text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Setting up...
            </span>
          ) : (
            'Set up Passkey'
          )}
        </button>
      </div>
    </div>
  );
}
