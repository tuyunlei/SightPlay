import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { useState, useEffect, useCallback } from 'react';

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
  const options: PublicKeyCredentialCreationOptionsJSON = await optionsResponse.json();
  const attResp = await startRegistration({ optionsJSON: options });

  const verifyResponse = await fetch('/api/auth/register-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ response: attResp, name, inviteToken }),
  });

  if (!verifyResponse.ok) throw new Error('Registration verification failed');
  return true;
}

async function performLogin(): Promise<boolean> {
  const optionsResponse = await fetch('/api/auth/login-options', {
    method: 'POST',
    credentials: 'include',
  });

  if (!optionsResponse.ok) throw new Error('Failed to get authentication options');
  const options: PublicKeyCredentialRequestOptionsJSON = await optionsResponse.json();
  const attResp = await startAuthentication({ optionsJSON: options });

  const verifyResponse = await fetch('/api/auth/login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ response: attResp }),
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
    async (name?: string, inviteToken?: string) => {
      try {
        await performRegister(name, inviteToken);
        await checkSession();
        return true;
      } catch (error) {
        console.error('Registration error:', error);
        return false;
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
