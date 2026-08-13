import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

const identitySuccess = <T,>(data: T) => ({ ok: true, data, requestId: 'test-request' });

const { guidancePortsMock, mainAppContentMock } = vi.hoisted(() => ({
  guidancePortsMock: vi.fn(),
  mainAppContentMock: vi.fn(),
}));

vi.mock('@sightplay/browser-adapters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sightplay/browser-adapters')>()),
  createBrowserGuidancePorts: guidancePortsMock,
}));

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  setContext: vi.fn(),
}));

vi.mock('@passwordless-id/webauthn', () => ({
  client: { register: vi.fn(), authenticate: vi.fn() },
}));

vi.mock('./app/presentation/MainAppContent', () => ({
  MainAppContent: (props: { route: unknown }) => {
    mainAppContentMock(props);
    return <div data-testid="protected-app">protected app</div>;
  },
}));

describe('App protected runtime lifecycle', () => {
  const requestMidiAccess = vi.fn(async () => ({
    inputs: new Map(),
    onstatechange: null,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      configurable: true,
      value: requestMidiAccess,
    });
    guidancePortsMock.mockReturnValue({
      chat: {
        request: vi.fn(async () => ({
          ok: true,
          reply: { replyText: 'test', challengeData: null },
        })),
      },
      clock: { now: () => 0 },
      scheduler: { schedule: () => vi.fn() },
    });
  });

  it('does not construct practice or guidance while the session is anonymous', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => identitySuccess({ authenticated: false, hasPasskeys: true }),
      }))
    );

    render(<App />);

    expect(await screen.findByTestId('login-screen')).toBeTruthy();
    expect(requestMidiAccess).not.toHaveBeenCalled();
    expect(guidancePortsMock).not.toHaveBeenCalled();
  });

  it('constructs the protected runtime only after an authenticated session is established', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => identitySuccess({ authenticated: true, hasPasskeys: true }),
      }))
    );

    render(<App />);

    expect(await screen.findByTestId('protected-app')).toBeTruthy();
    expect(window.location.pathname).toBe('/practice');
    expect(requestMidiAccess).toHaveBeenCalledTimes(1);
    expect(guidancePortsMock).toHaveBeenCalledOnce();
  });

  it('assembles an authenticated deep link with its decoded protected route', async () => {
    window.history.replaceState(null, '', '/library?difficulty=intermediate');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => identitySuccess({ authenticated: true, hasPasskeys: true }),
      }))
    );

    render(<App />);

    expect(await screen.findByTestId('protected-app')).toBeTruthy();
    expect(mainAppContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        route: { kind: 'library', difficulty: 'intermediate' },
      })
    );
  });
});
