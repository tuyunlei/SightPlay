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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    hasPasskeys: false,
    isLoading: true,
  });

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });
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
    async (name?: string) => {
      try {
        // Get registration options
        const optionsResponse = await fetch('/api/auth/register-options', {
          method: 'POST',
          credentials: 'include',
        });

        if (!optionsResponse.ok) {
          throw new Error('Failed to get registration options');
        }

        const options: PublicKeyCredentialCreationOptionsJSON = await optionsResponse.json();

        // Start registration
        const attResp = await startRegistration({ optionsJSON: options });

        // Verify registration
        const verifyResponse = await fetch('/api/auth/register-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ response: attResp, name }),
        });

        if (!verifyResponse.ok) {
          throw new Error('Registration verification failed');
        }

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
      // Get authentication options
      const optionsResponse = await fetch('/api/auth/login-options', {
        method: 'POST',
        credentials: 'include',
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get authentication options');
      }

      const options: PublicKeyCredentialRequestOptionsJSON = await optionsResponse.json();

      // Start authentication
      const attResp = await startAuthentication({ optionsJSON: options });

      // Verify authentication
      const verifyResponse = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ response: attResp }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Authentication verification failed');
      }

      await checkSession();
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }, [checkSession]);

  const logout = useCallback(() => {
    // Clear cookie by setting it to expire
    document.cookie = 'auth_token=; Max-Age=0; path=/';
    setState({
      isAuthenticated: false,
      hasPasskeys: state.hasPasskeys,
      isLoading: false,
    });
  }, [state.hasPasskeys]);

  return {
    ...state,
    login,
    register,
    logout,
    checkSession,
  };
}
