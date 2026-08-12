import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppContentRoute } from '@sightplay/app-shell';

import type { Recommendation } from '../domain/recommendations';
import { translations } from '../i18n';
import { usePracticeStore } from '../store/practiceStore';

import { ContentView } from './ContentView';

vi.mock('../features/library/SongLibrary', () => ({
  SongLibrary: ({ difficulty }: { difficulty?: string }) => (
    <div data-testid="library" data-difficulty={difficulty ?? 'all'} />
  ),
}));
vi.mock('./RandomPracticeView', () => ({
  RandomPracticeView: () => <div data-testid="random-practice" />,
}));
vi.mock('./SongPracticeSection', () => ({
  SongPracticeSection: ({
    showComplete,
    onComplete,
    recommendations,
    onApplyRec,
  }: {
    showComplete: boolean;
    onComplete: () => void;
    recommendations: Recommendation[];
    onApplyRec: (recommendation: Recommendation) => void;
  }) => (
    <section>
      <output data-testid="completion-visible">{String(showComplete)}</output>
      <button onClick={onComplete}>complete-song</button>
      {recommendations[0] && (
        <button onClick={() => onApplyRec(recommendations[0])}>apply-first-recommendation</button>
      )}
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
  beforeEach(() => {
    usePracticeStore.setState({ practiceMode: 'random' });
  });

  it('does not restore stale completion after leaving and returning to a song', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'complete-song' }));
    expect(screen.getByTestId('completion-visible').textContent).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'go-library' }));
    expect(screen.getByTestId('library')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'return-song' }));
    expect(screen.getByTestId('completion-visible').textContent).toBe('false');
  });

  it('applies a completed-song recommendation to the resulting library filter', () => {
    usePracticeStore.setState({ practiceMode: 'song' });
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'complete-song' }));
    fireEvent.click(screen.getByRole('button', { name: 'apply-first-recommendation' }));

    expect(screen.getByTestId('library').getAttribute('data-difficulty')).toBe('intermediate');
  });
});
