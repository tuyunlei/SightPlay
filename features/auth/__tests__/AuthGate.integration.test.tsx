import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppRoute } from '@sightplay/app-shell';

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

function AuthGateHarness({ initialRoute = { kind: 'login' } }: { initialRoute?: AppRoute }) {
  const [route, setRoute] = useState<AppRoute>(initialRoute);

  return (
    <>
      <output data-testid="current-route">{JSON.stringify(route)}</output>
      <AuthGate route={route} navigate={setRoute}>
        {(protectedRoute) => (
          <div data-testid="main-app" data-route={JSON.stringify(protectedRoute)}>
            main-app
          </div>
        )}
      </AuthGate>
    </>
  );
}

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

    render(<AuthGateHarness />);

    expect(await screen.findByTestId('login-screen')).toBeTruthy();
    expect(screen.queryByTestId('main-app')).not.toBeTruthy();
  });

  it('redirects an anonymous protected route before constructing protected children', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ authenticated: false, hasPasskeys: true }),
      }))
    );

    render(<AuthGateHarness initialRoute={{ kind: 'library', difficulty: 'advanced' }} />);

    expect(await screen.findByTestId('login-screen')).toBeTruthy();
    expect(screen.getByTestId('current-route').textContent).toBe(JSON.stringify({ kind: 'login' }));
    expect(screen.queryByTestId('main-app')).toBeNull();
  });

  it('delivers an authenticated deep link as the protected scene', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ authenticated: true, hasPasskeys: true }),
      }))
    );

    render(<AuthGateHarness initialRoute={{ kind: 'library', difficulty: 'intermediate' }} />);

    expect((await screen.findByTestId('main-app')).getAttribute('data-route')).toBe(
      JSON.stringify({ kind: 'library', difficulty: 'intermediate' })
    );
  });

  it('lets the user retry and complete sign-in after passkey authentication is canceled', async () => {
    const user = userEvent.setup();
    let sessionChecks = 0;
    const cancellation = new Error('The operation was canceled.');
    cancellation.name = 'NotAllowedError';
    authenticateMock
      .mockRejectedValueOnce(cancellation)
      .mockResolvedValueOnce({ id: 'assertion-1' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input === '/api/auth/session') {
          sessionChecks += 1;
          return {
            ok: true,
            json: async () => ({ authenticated: sessionChecks >= 2, hasPasskeys: true }),
          } as Response;
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

    render(<AuthGateHarness />);

    await screen.findByTestId('login-screen');
    await user.click(screen.getByRole('button', { name: translations.zh.authLoginButton }));

    await waitFor(() => expect(authenticateMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: translations.zh.authLoginButton }));

    expect(await screen.findByTestId('main-app')).toBeTruthy();
  });

  it('lets a user return to passkey login after opening invite registration', async () => {
    const user = userEvent.setup();
    let sessionChecks = 0;
    authenticateMock.mockResolvedValue({ id: 'assertion-1' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input === '/api/auth/session') {
          sessionChecks += 1;
          return {
            ok: true,
            json: async () => ({ authenticated: sessionChecks >= 2, hasPasskeys: true }),
          } as Response;
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

    render(<AuthGateHarness />);

    await screen.findByTestId('login-screen');
    await user.click(
      screen.getByRole('button', { name: translations.zh.authNoAccountRegisterLink })
    );
    expect(await screen.findByTestId('register-screen')).toBeTruthy();
    expect(screen.queryByRole('button', { name: translations.zh.authLoginButton })).toBeNull();

    await user.click(
      screen.getByRole('button', { name: translations.zh.authHaveAccountLoginLink })
    );
    expect(await screen.findByTestId('login-screen')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: translations.zh.authLoginButton }));

    expect(await screen.findByTestId('main-app')).toBeTruthy();
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

    render(<AuthGateHarness />);

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

    render(<AuthGateHarness />);

    await screen.findByTestId('login-screen');
    await user.click(screen.getByRole('button', { name: translations.zh.authLoginButton }));

    expect(await screen.findByTestId('main-app')).toBeTruthy();
    expect(screen.queryByTestId('login-screen')).not.toBeTruthy();
  });
});
