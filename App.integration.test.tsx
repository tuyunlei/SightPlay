import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

const { practiceSessionMock, aiCoachMock, testApiMock, mainAppContentMock } = vi.hoisted(() => ({
  practiceSessionMock: vi.fn(),
  aiCoachMock: vi.fn(),
  testApiMock: vi.fn(),
  mainAppContentMock: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  setContext: vi.fn(),
}));

vi.mock('@passwordless-id/webauthn', () => ({
  client: { register: vi.fn(), authenticate: vi.fn() },
}));

vi.mock('./hooks/usePracticeSession', () => ({
  usePracticeSession: practiceSessionMock,
}));

vi.mock('./hooks/useAiCoach', () => ({
  useAiCoach: aiCoachMock,
}));

vi.mock('./hooks/useTestAPI', () => ({
  useTestAPI: testApiMock,
}));

vi.mock('./views/MainAppContent', () => ({
  MainAppContent: (props: { route: unknown }) => {
    mainAppContentMock(props);
    return <div data-testid="protected-app">protected app</div>;
  },
}));

describe('App protected runtime lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');

    practiceSessionMock.mockReturnValue({
      state: { clef: 'treble' },
      derived: {},
      actions: { loadChallenge: vi.fn() },
      pressedKeys: new Set(),
    });
    aiCoachMock.mockReturnValue({
      chatInput: '',
      setChatInput: vi.fn(),
      chatHistory: [],
      isLoadingAi: false,
      sendMessage: vi.fn(),
      chatEndRef: { current: null },
    });
  });

  it('does not construct practice or guidance while the session is anonymous', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ authenticated: false, hasPasskeys: true }),
      }))
    );

    render(<App />);

    expect(await screen.findByTestId('login-screen')).toBeTruthy();
    expect(practiceSessionMock).not.toHaveBeenCalled();
    expect(aiCoachMock).not.toHaveBeenCalled();
    expect(testApiMock).not.toHaveBeenCalled();
  });

  it('constructs the protected runtime only after an authenticated session is established', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ authenticated: true, hasPasskeys: true }),
      }))
    );

    render(<App />);

    expect(await screen.findByTestId('protected-app')).toBeTruthy();
    expect(window.location.pathname).toBe('/practice');
    expect(practiceSessionMock).toHaveBeenCalledTimes(1);
    expect(aiCoachMock).toHaveBeenCalledTimes(1);
    expect(testApiMock).toHaveBeenCalledTimes(1);
  });

  it('assembles an authenticated deep link with its decoded protected route', async () => {
    window.history.replaceState(null, '', '/library?difficulty=intermediate');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ authenticated: true, hasPasskeys: true }),
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
