import { KeyRound } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from './useAuth';

export function LoginScreen() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    const success = await login();

    if (!success) {
      setError('Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-800/50 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="rounded-full bg-indigo-500/10 p-4">
            <KeyRound className="h-12 w-12 text-indigo-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
            <p className="mt-2 text-slate-400">Sign in with your passkey to continue</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-medium text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Authenticating...
            </span>
          ) : (
            'Sign in with Passkey'
          )}
        </button>
      </div>
    </div>
  );
}
