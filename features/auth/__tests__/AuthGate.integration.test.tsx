import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { translations } from '../../../i18n';
import { useUiStore } from '../../../store/uiStore';
import { AuthGate } from '../AuthGate';

const { registerMock, authenticateMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
  authenticateMock: vi.fn(),
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
  captureException: vi.fn(),
}));

describe('AuthGate integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ lang: 'zh' });
    Object.defineProperty(window, 'PublicKeyCredential', {
      writable: true,
      configurable: true,
      value: function PublicKeyCredential() {},
    });
  });

  it('shows LoginScreen for unauthenticated user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input === '/api/auth/session') {
          return {
            ok: true,
            json: async () => ({ authenticated: false, hasPasskeys: true }),
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      })
    );

    render(
      <AuthGate>
        <div data-testid="main-app">main-app</div>
      </AuthGate>
    );

    expect(await screen.findByTestId('login-screen')).toBeTruthy();
    expect(screen.queryByTestId('main-app')).not.toBeTruthy();
  });

  it('shows login error and register option when login fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input === '/api/auth/session') {
          return {
            ok: true,
            json: async () => ({ authenticated: false, hasPasskeys: true }),
          } as Response;
        }
        if (input === '/api/auth/login-options') {
          return { ok: false, json: async () => ({}) } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      })
    );

    render(
      <AuthGate>
        <div data-testid="main-app">main-app</div>
      </AuthGate>
    );

    await screen.findByTestId('login-screen');
    await user.click(screen.getByRole('button', { name: translations.zh.authLoginButton }));

    expect(await screen.findByText(translations.zh.authErrorLoginOptionsFailed)).toBeTruthy();
    expect(screen.getByTestId('register-section')).toBeTruthy();
  });

  it('registers with invite code via RegisterCard flow', async () => {
    const user = userEvent.setup();

    registerMock.mockResolvedValue({ id: 'credential-1' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input === '/api/auth/session') {
          return {
            ok: true,
            json: async () => ({ authenticated: false, hasPasskeys: false }),
          } as Response;
        }
        if (input === '/api/auth/register-options') {
          return {
            ok: true,
            json: async () => ({
              challenge: 'challenge',
              user: { id: 'u1', name: 'user', displayName: 'User' },
              rp: { id: 'localhost', name: 'SightPlay' },
              pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
              authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
            }),
          } as Response;
        }
        if (input === '/api/auth/register-verify') {
          const body = JSON.parse((init?.body as string) || '{}');
          expect(body.inviteCode.replace('-', '')).toBe('A2CD2345');
          return { ok: true, json: async () => ({}) } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      })
    );

    render(
      <AuthGate>
        <div data-testid="main-app">main-app</div>
      </AuthGate>
    );

    await screen.findByTestId('login-screen');
    await user.click(
      screen.getByRole('button', { name: translations.zh.authNoAccountRegisterLink })
    );

    const inviteInput = screen.getByLabelText(translations.zh.authInviteCodeLabel);
    fireEvent.change(inviteInput, { target: { value: 'A2CD2345' } });
    await user.click(screen.getByRole('button', { name: translations.zh.authRegisterButton }));

    await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1));
    expect(
      (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.some(
        (c) => c[0] === '/api/auth/register-verify'
      )
    ).toBe(true);
  });

  it('passes through children after successful auth', async () => {
    const user = userEvent.setup();
    let sessionChecks = 0;

    authenticateMock.mockResolvedValue({ id: 'assertion-1' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input === '/api/auth/session') {
          sessionChecks += 1;
          const authenticated = sessionChecks >= 2;
          return { ok: true, json: async () => ({ authenticated, hasPasskeys: true }) } as Response;
        }
        if (input === '/api/auth/login-options') {
          return {
            ok: true,
            json: async () => ({
              challenge: 'challenge',
              allowCredentials: [{ id: 'cred-1', transports: ['internal'] }],
              userVerification: 'preferred',
              timeout: 10000,
            }),
          } as Response;
        }
        if (input === '/api/auth/login-verify') {
          return { ok: true, json: async () => ({}) } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      })
    );

    render(
      <AuthGate>
        <div data-testid="main-app">main-app</div>
      </AuthGate>
    );

    await screen.findByTestId('login-screen');
    await user.click(screen.getByRole('button', { name: translations.zh.authLoginButton }));

    expect(await screen.findByTestId('main-app')).toBeTruthy();
    expect(screen.queryByTestId('login-screen')).not.toBeTruthy();
  });
});
