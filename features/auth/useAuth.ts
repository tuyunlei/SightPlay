import { client } from '@passwordless-id/webauthn';
import { useState, useEffect, useCallback } from 'react';

// Convert base64url string to ArrayBuffer (for WebAuthn credential IDs)
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

interface AuthState {
  isAuthenticated: boolean;
  hasPasskeys: boolean;
  isLoading: boolean;
}

async function performRegister(name?: string, inviteToken?: string): Promise<boolean> {
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
      excludeCredentials: options.excludeCredentials?.map(
        (c: { id: string; type: string; transports?: string[] }) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })
      ),
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
        const message = error instanceof Error ? error.message : 'Registration failed';
        console.error('Registration error:', message);
        return message;
      }
    },
    [checkSession]
  );

  const login = useCallback(async () => {
    try {
      await performLogin();
      await checkSession();
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }, [checkSession]);

  const logout = useCallback(() => {
    document.cookie = 'auth_token=; Max-Age=0; path=/';
    setState({ isAuthenticated: false, hasPasskeys: state.hasPasskeys, isLoading: false });
  }, [state.hasPasskeys]);

  return { ...state, login, register, logout, checkSession };
}
