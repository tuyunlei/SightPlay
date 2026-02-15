import { KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useAuthContext } from './useAuthContext';

interface InviteRegisterProps {
  token: string;
  onSuccess: () => void;
}

function ValidatingView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-800/50 p-8 text-center backdrop-blur-xl">
        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-indigo-400" />
        <p className="text-lg text-slate-300">Validating invite link...</p>
      </div>
    </div>
  );
}

function InvalidView({ error }: { error: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-800/50 p-8 backdrop-blur-xl">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertCircle className="h-12 w-12 text-red-400" />
          </div>
        </div>
        <h1 className="mb-4 text-center text-2xl font-bold text-white">Invalid Invite Link</h1>
        <p className="mb-6 text-center text-slate-300">{error}</p>
        <p className="text-center text-sm text-slate-400">
          Invite links are valid for 30 minutes and can only be used once.
        </p>
      </div>
    </div>
  );
}

function RegisterView({
  isRegistering,
  error,
  onRegister,
}: {
  isRegistering: boolean;
  error: string | null;
  onRegister: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-800/50 p-8 backdrop-blur-xl">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-indigo-500/10 p-4">
            <KeyRound className="h-12 w-12 text-indigo-400" />
          </div>
        </div>

        <h1 className="mb-2 text-center text-3xl font-bold text-white">Add Your Passkey</h1>
        <p className="mb-8 text-center text-slate-300">
          You've been invited to add a new passkey to SightPlay
        </p>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 p-4 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={onRegister}
          disabled={isRegistering}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRegistering ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Registering Passkey...
            </>
          ) : (
            <>
              <KeyRound className="h-5 w-5" />
              Register Passkey
            </>
          )}
        </button>

        <div className="mt-6 rounded-lg bg-slate-900/50 p-4">
          <p className="text-xs text-slate-400">
            <strong className="text-slate-300">What's a passkey?</strong>
            <br />A passkey is a secure way to sign in without passwords. It uses your device's
            biometric authentication (fingerprint, face recognition) or PIN to verify it's you.
          </p>
        </div>
      </div>
    </div>
  );
}

export function InviteRegister({ token, onSuccess }: InviteRegisterProps) {
  const { register } = useAuthContext();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/invite?token=${token}`);
        const data = await response.json();
        setIsValid(data.valid);
        if (!data.valid) {
          setError('This invite link is invalid or has expired');
        }
      } catch {
        setError('Failed to validate invite link');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleRegister = async () => {
    setIsRegistering(true);
    setError(null);

    try {
      const result = await register(undefined, token);
      if (result === true) {
        onSuccess();
      } else {
        setError(typeof result === 'string' ? result : 'Registration failed. Please try again.');
      }
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  if (isValidating) return <ValidatingView />;
  if (!isValid) return <InvalidView error={error} />;
  return <RegisterView isRegistering={isRegistering} error={error} onRegister={handleRegister} />;
}
