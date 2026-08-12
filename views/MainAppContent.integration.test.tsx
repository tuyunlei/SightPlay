import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AppRoute, ProtectedAppRoute } from '@sightplay/app-shell';

import { translations } from '../i18n';

import { MainAppContent } from './MainAppContent';

const contentUnmounted = vi.hoisted(() => vi.fn());

vi.mock('../components/layout/BackgroundDecor', () => ({ BackgroundDecor: () => null }));
vi.mock('../components/layout/PasskeyButton', () => ({
  PasskeyButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick}>open-passkeys</button>
  ),
}));
vi.mock('../components/navigation/NavigationTabs', () => ({ NavigationTabs: () => null }));
vi.mock('../features/auth/PasskeyManagement', () => ({
  PasskeyManagement: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose}>close-passkeys</button>
  ),
}));
vi.mock('./ContentView', () => ({
  ContentView: ({ route }: { route: AppRoute }) => {
    useEffect(() => contentUnmounted, []);
    return <output data-testid="content-route">{JSON.stringify(route)}</output>;
  },
}));

function Harness() {
  const [route, setRoute] = useState<ProtectedAppRoute>({
    kind: 'songPractice',
    songId: 'twinkle-twinkle',
  });
  const [lastReplace, setLastReplace] = useState(false);

  const navigate = (nextRoute: AppRoute, replace = false) => {
    if (nextRoute.kind === 'login' || nextRoute.kind === 'register') {
      throw new Error('Authenticated content cannot navigate to a public route');
    }
    setLastReplace(replace);
    setRoute(nextRoute);
  };

  return (
    <>
      <output data-testid="shell-route">{JSON.stringify(route)}</output>
      <output data-testid="last-replace">{String(lastReplace)}</output>
      <MainAppContent
        route={route}
        navigate={navigate}
        state={{} as never}
        derived={{} as never}
        actions={{} as never}
        pressedKeys={new Map()}
        t={translations.en}
        toggleLang={vi.fn()}
        chatInput=""
        setChatInput={vi.fn()}
        chatHistory={[]}
        isLoadingAi={false}
        sendMessage={vi.fn()}
        chatEndRef={{ current: null }}
        lang="en"
      />
    </>
  );
}

describe('MainAppContent passkey route overlay', () => {
  it('preserves the source content and replaces back to it when closed', () => {
    contentUnmounted.mockClear();
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'open-passkeys' }));

    expect(screen.getByTestId('shell-route').textContent).toBe(
      JSON.stringify({
        kind: 'passkeys',
        returnTo: { kind: 'songPractice', songId: 'twinkle-twinkle' },
      })
    );
    expect(screen.getByTestId('content-route').textContent).toBe(
      JSON.stringify({ kind: 'songPractice', songId: 'twinkle-twinkle' })
    );
    expect(contentUnmounted).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'close-passkeys' }));

    expect(screen.getByTestId('shell-route').textContent).toBe(
      JSON.stringify({ kind: 'songPractice', songId: 'twinkle-twinkle' })
    );
    expect(screen.getByTestId('last-replace').textContent).toBe('true');
    expect(contentUnmounted).not.toHaveBeenCalled();
  });
});
