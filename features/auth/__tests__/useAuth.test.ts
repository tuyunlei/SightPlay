import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { translations } from '../../../i18n';
import { useUiStore } from '../../../store/uiStore';
import { useAuth } from '../useAuth';

const { registerMock, authenticateMock, captureExceptionMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
  authenticateMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@passwordless-id/webauthn', () => ({
  client: {
    register: registerMock,
    authenticate: authenticateMock,
  },
}));

vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  setContext: vi.fn(),
  captureException: captureExceptionMock,
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ lang: 'zh' });
    Object.defineProperty(window, 'PublicKeyCredential', {
      writable: true,
      configurable: true,
      value: function PublicKeyCredential() {},
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input === '/api/auth/session') {
          return {
            ok: true,
            json: async () => ({ authenticated: false, hasPasskeys: false }),
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      })
    );
  });

  it('loads initial auth state from session', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (input: string) => {
      if (input === '/api/auth/session') {
        return {
          ok: true,
          json: async () => ({ authenticated: true, hasPasskeys: true }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasPasskeys).toBe(true);
  });

  it('returns localized error when WebAuthn is not supported on register', async () => {
    Object.defineProperty(window, 'PublicKeyCredential', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let registerResult: true | string = true;
    await act(async () => {
      registerResult = await result.current.register('Tester', 'invite-code');
    });

    expect(registerResult).toBe(translations.zh.authErrorPasskeysNotSupportedBrowser);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('returns localized error when login options request fails', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (input: string) => {
      if (input === '/api/auth/session') {
        return {
          ok: true,
          json: async () => ({ authenticated: false, hasPasskeys: true }),
        } as Response;
      }

      if (input === '/api/auth/login-options') {
        return {
          ok: false,
          json: async () => ({}),
        } as Response;
      }

      return { ok: true, json: async () => ({}) } as Response;
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let loginResult: true | string = true;
    await act(async () => {
      loginResult = await result.current.login();
    });

    expect(loginResult).toBe(translations.zh.authErrorLoginOptionsFailed);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(authenticateMock).not.toHaveBeenCalled();
  });

  it('clears auth cookie state on logout', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (input: string) => {
      if (input === '/api/auth/session') {
        return {
          ok: true,
          json: async () => ({ authenticated: true, hasPasskeys: true }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasPasskeys).toBe(true);
  });
});
