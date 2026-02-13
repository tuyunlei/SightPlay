import { client } from '@passwordless-id/webauthn';
import * as Sentry from '@sentry/react';
import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  hasPasskeys: boolean;
  isLoading: boolean;
}

// Check if WebAuthn is supported
function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
}

// Get user-friendly error message
function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // User canceled biometric authentication
    if (error.name === 'NotAllowedError') {
      return 'Authentication was canceled. Please try again.';
    }
    // User doesn't have a compatible authenticator
    if (error.name === 'NotSupportedError') {
      return 'Your device does not support passkeys. Please use a device with biometric authentication.';
    }
    // Network or timeout errors
    if (error.name === 'NetworkError' || error.name === 'AbortError') {
      return 'Connection timeout. Please check your network and try again.';
    }
    return error.message;
  }
  return 'An unknown error occurred';
}

async function performRegister(name?: string, inviteToken?: string): Promise<boolean> {
  // Check WebAuthn support before attempting registration
  if (!isWebAuthnSupported()) {
    throw new Error(
      'Passkeys are not supported on this browser. Please use a modern browser with biometric authentication support.'
    );
  }

  const optionsResponse = await fetch('/api/auth/register-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ inviteToken }),
  });

  if (!optionsResponse.ok) throw new Error('Failed to get registration options');
  const options = await optionsResponse.json();

  // Use @passwordless-id/webauthn client to create credential
  const registration = await client.register({
    challenge: options.challenge,
    user: {
      id: options.user.id,
      name: options.user.name,
      displayName: options.user.displayName,
    },
    discoverable: options.authenticatorSelection?.residentKey,
    userVerification: options.authenticatorSelection?.userVerification,
    customProperties: {
      rp: options.rp,
      pubKeyCredParams: options.pubKeyCredParams,
      excludeCredentials: options.excludeCredentials,
      timeout: options.timeout,
    },
  });

  const verifyResponse = await fetch('/api/auth/register-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ response: registration, name, inviteToken }),
  });

  if (!verifyResponse.ok) {
    const data = await verifyResponse.json().catch(() => ({}));
    throw new Error(data.error || 'Registration verification failed');
  }
  return true;
}

async function performLogin(): Promise<boolean> {
  // Check WebAuthn support before attempting login
  if (!isWebAuthnSupported()) {
    throw new Error(
      'Passkeys are not supported on this browser. Please use a modern browser with biometric authentication support.'
    );
  }

  const optionsResponse = await fetch('/api/auth/login-options', {
    method: 'POST',
    credentials: 'include',
  });

  if (!optionsResponse.ok) throw new Error('Failed to get authentication options');
  const options = await optionsResponse.json();

  // Use @passwordless-id/webauthn client to authenticate
  const authentication = await client.authenticate({
    challenge: options.challenge,
    allowCredentials: options.allowCredentials?.map((c: { id: string; transports?: string[] }) => ({
      id: c.id,
      transports: c.transports || [],
    })),
    userVerification: options.userVerification,
    timeout: options.timeout,
  });

  const verifyResponse = await fetch('/api/auth/login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ response: authentication }),
  });

  if (!verifyResponse.ok) throw new Error('Authentication verification failed');
  return true;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    hasPasskeys: false,
    isLoading: true,
  });

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      const data = await response.json();
      setState({
        isAuthenticated: data.authenticated,
        hasPasskeys: data.hasPasskeys,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error checking session:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const register = useCallback(
    async (name?: string, inviteToken?: string): Promise<true | string> => {
      try {
        await performRegister(name, inviteToken);
        await checkSession();
        return true;
      } catch (error) {
        const message = getAuthErrorMessage(error);
        Sentry.captureException(error, {
          tags: { flow: 'register' },
          extra: { errorName: error instanceof Error ? error.name : 'unknown' },
        });
        console.error('Registration error:', message, error);
        return message;
      }
    },
    [checkSession]
  );

  const login = useCallback(async (): Promise<true | string> => {
    try {
      await performLogin();
      await checkSession();
      return true;
    } catch (error) {
      const message = getAuthErrorMessage(error);
      Sentry.captureException(error, {
        tags: { flow: 'login' },
        extra: { errorName: error instanceof Error ? error.name : 'unknown' },
      });
      console.error('Authentication error:', message, error);
      return message;
    }
  }, [checkSession]);

  const logout = useCallback(() => {
    document.cookie = 'auth_token=; Max-Age=0; path=/';
    setState({ isAuthenticated: false, hasPasskeys: state.hasPasskeys, isLoading: false });
  }, [state.hasPasskeys]);

  return { ...state, login, register, logout, checkSession };
}
