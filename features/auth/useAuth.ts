import { client } from '@passwordless-id/webauthn';
import * as Sentry from '@sentry/react';
import { useState, useEffect, useCallback } from 'react';

import { translations } from '../../i18n';
import { useUiStore } from '../../store/uiStore';

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
function getAuthErrorMessage(error: unknown, t: (typeof translations)['en']): string {
  if (error instanceof Error) {
    // User canceled biometric authentication
    if (error.name === 'NotAllowedError') {
      return t.authErrorCanceled;
    }
    // User doesn't have a compatible authenticator
    if (error.name === 'NotSupportedError') {
      return t.authErrorNotSupportedDevice;
    }
    // Network or timeout errors
    if (error.name === 'NetworkError' || error.name === 'AbortError') {
      return t.authErrorConnectionTimeout;
    }

    switch (error.message) {
      case 'authErrorPasskeysNotSupportedBrowser':
        return t.authErrorPasskeysNotSupportedBrowser;
      case 'authErrorRegisterOptionsFailed':
        return t.authErrorRegisterOptionsFailed;
      case 'authErrorRegisterVerificationFailed':
        return t.authErrorRegisterVerificationFailed;
      case 'authErrorLoginOptionsFailed':
        return t.authErrorLoginOptionsFailed;
      case 'authErrorLoginVerificationFailed':
        return t.authErrorLoginVerificationFailed;
      default:
        return error.message;
    }
  }
  return t.authErrorUnknown;
}

async function performRegister(name?: string, inviteCode?: string): Promise<boolean> {
  // Check WebAuthn support before attempting registration
  if (!isWebAuthnSupported()) {
    throw new Error('authErrorPasskeysNotSupportedBrowser');
  }

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Registration starting',
    level: 'info',
    data: { hasName: !!name, hasInviteCode: !!inviteCode },
  });

  const optionsResponse = await fetch('/api/auth/register-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ inviteCode }),
  });

  if (!optionsResponse.ok) {
    const data = await optionsResponse.json().catch(() => ({}));
    throw new Error(data.error || 'authErrorRegisterOptionsFailed');
  }
  const options = await optionsResponse.json();

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Register options received',
    level: 'info',
    data: { rpId: options.rp?.id, userId: options.user?.id },
  });

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
      timeout: options.timeout,
      // Note: excludeCredentials omitted — the library passes base64url strings
      // but the browser expects ArrayBuffer, causing TypeError on mobile browsers.
    },
  });

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Registration credential created',
    level: 'info',
  });

  const verifyResponse = await fetch('/api/auth/register-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ response: registration, name, inviteCode }),
  });

  if (!verifyResponse.ok) {
    const data = await verifyResponse.json().catch(() => ({}));
    throw new Error(data.error || 'authErrorRegisterVerificationFailed');
  }
  return true;
}

async function performLogin(): Promise<boolean> {
  // Check WebAuthn support before attempting login
  if (!isWebAuthnSupported()) {
    throw new Error('authErrorPasskeysNotSupportedBrowser');
  }

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Login starting',
    level: 'info',
  });

  const optionsResponse = await fetch('/api/auth/login-options', {
    method: 'POST',
    credentials: 'include',
  });

  if (!optionsResponse.ok) throw new Error('authErrorLoginOptionsFailed');
  const options = await optionsResponse.json();

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Login options received',
    level: 'info',
    data: {
      credentialCount: options.allowCredentials?.length,
      transports: options.allowCredentials?.map((c: { transports?: string[] }) => c.transports),
      hints: options.hints,
    },
  });

  Sentry.setContext('webauthn_login_options', {
    credentialCount: options.allowCredentials?.length,
    transports: JSON.stringify(
      options.allowCredentials?.map((c: { transports?: string[] }) => c.transports)
    ),
    hints: JSON.stringify(options.hints),
    userVerification: options.userVerification,
    timeout: options.timeout,
  });

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

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Login credential received',
    level: 'info',
    data: { credentialId: authentication.id },
  });

  const verifyResponse = await fetch('/api/auth/login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ response: authentication }),
  });

  if (!verifyResponse.ok) throw new Error('authErrorLoginVerificationFailed');
  return true;
}

export function useAuth() {
  const lang = useUiStore((store) => store.lang);
  const t = translations[lang];

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
    async (name?: string, inviteCode?: string): Promise<true | string> => {
      try {
        await performRegister(name, inviteCode);
        await checkSession();
        return true;
      } catch (error) {
        const message = getAuthErrorMessage(error, t);
        Sentry.captureException(error, {
          tags: { flow: 'register' },
          extra: {
            errorName: error instanceof Error ? error.name : 'unknown',
            userAgent: navigator.userAgent,
          },
        });
        console.error('Registration error:', message, error);
        return message;
      }
    },
    [checkSession, t]
  );

  const login = useCallback(async (): Promise<true | string> => {
    try {
      await performLogin();
      await checkSession();
      return true;
    } catch (error) {
      const message = getAuthErrorMessage(error, t);
      Sentry.captureException(error, {
        tags: { flow: 'login' },
        extra: {
          errorName: error instanceof Error ? error.name : 'unknown',
          userAgent: navigator.userAgent,
        },
      });
      console.error('Authentication error:', message, error);
      return message;
    }
  }, [checkSession, t]);

  const logout = useCallback(() => {
    document.cookie = 'auth_token=; Max-Age=0; path=/';
    setState({ isAuthenticated: false, hasPasskeys: state.hasPasskeys, isLoading: false });
  }, [state.hasPasskeys]);

  return { ...state, login, register, logout, checkSession };
}
