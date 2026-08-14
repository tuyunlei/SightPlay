import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useIdentity } from '@sightplay/identity-client';

import App from './App';

const identitySuccess = <T,>(data: T) => ({ ok: true, data, requestId: 'test-request' });

const {
  guidancePortsMock,
  mainAppContentMock,
  practicePortsMock,
  midiDisposeMock,
  microphoneDisposeMock,
} = vi.hoisted(() => ({
  guidancePortsMock: vi.fn(),
  mainAppContentMock: vi.fn(),
  practicePortsMock: vi.fn(),
  midiDisposeMock: vi.fn(),
  microphoneDisposeMock: vi.fn(),
}));

vi.mock('@sightplay/browser-adapters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sightplay/browser-adapters')>()),
  createBrowserGuidancePorts: guidancePortsMock,
  createBrowserPracticePorts: practicePortsMock,
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
    const identity = useIdentity();
    mainAppContentMock(props);
    return (
      <div data-testid="protected-app">
        protected app
        <button type="button" onClick={identity.logout}>
          test logout
        </button>
      </div>
    );
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
    practicePortsMock.mockReturnValue({
      clock: { now: () => 0 },
      scheduler: { schedule: () => vi.fn() },
      seed: { nextSeed: () => 1 },
      midi: {
        start: async () => {
          await requestMidiAccess();
        },
        dispose: midiDisposeMock,
      },
      microphone: {
        start: vi.fn(async () => undefined),
        stop: vi.fn(),
        dispose: microphoneDisposeMock,
      },
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
    expect(practicePortsMock).not.toHaveBeenCalled();
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

  it('disposes the protected runtime when logout invalidates the session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => ({
        ok: true,
        json: async () =>
          identitySuccess(
            String(input).endsWith('/api/auth/logout')
              ? { completed: true }
              : { authenticated: true, hasPasskeys: true }
          ),
      }))
    );

    render(<App />);

    expect(await screen.findByTestId('protected-app')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'test logout' }));

    expect(await screen.findByTestId('login-screen')).toBeTruthy();
    await waitFor(() => {
      expect(midiDisposeMock).toHaveBeenCalledTimes(1);
      expect(microphoneDisposeMock).toHaveBeenCalledTimes(1);
    });
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
