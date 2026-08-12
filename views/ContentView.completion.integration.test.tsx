import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AppContentRoute } from '@sightplay/app-shell';

import { translations } from '../i18n';

import { ContentView } from './ContentView';

vi.mock('../features/library/SongLibrary', () => ({
  SongLibrary: () => <div data-testid="library" />,
}));
vi.mock('./RandomPracticeView', () => ({
  RandomPracticeView: () => <div data-testid="random-practice" />,
}));
vi.mock('./SongPracticeSection', () => ({
  SongPracticeSection: ({
    showComplete,
    onComplete,
  }: {
    showComplete: boolean;
    onComplete: () => void;
  }) => (
    <section>
      <output data-testid="completion-visible">{String(showComplete)}</output>
      <button onClick={onComplete}>complete-song</button>
    </section>
  ),
}));

function Harness() {
  const [route, setRoute] = useState<AppContentRoute>({
    kind: 'songPractice',
    songId: 'twinkle-twinkle',
  });

  return (
    <>
      <button onClick={() => setRoute({ kind: 'library' })}>go-library</button>
      <button onClick={() => setRoute({ kind: 'songPractice', songId: 'twinkle-twinkle' })}>
        return-song
      </button>
      <ContentView
        route={route}
        navigate={setRoute}
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

describe('ContentView song completion lifecycle', () => {
  it('does not restore stale completion after leaving and returning to a song', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'complete-song' }));
    expect(screen.getByTestId('completion-visible').textContent).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'go-library' }));
    expect(screen.getByTestId('library')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'return-song' }));
    expect(screen.getByTestId('completion-visible').textContent).toBe('false');
  });
});
