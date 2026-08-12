import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppContentRoute } from '@sightplay/app-shell';

import { translations } from '../i18n';
import { usePracticeStore } from '../store/practiceStore';

import { ContentView } from './ContentView';

vi.mock('../features/library/SongLibrary', () => ({
  SongLibrary: ({
    difficulty,
    onDifficultyChange,
    onSongSelect,
  }: {
    difficulty?: string;
    onDifficultyChange: (difficulty: 'intermediate') => void;
    onSongSelect: (id: string) => void;
  }) => (
    <section data-testid="mock-song-library">
      <output data-testid="library-difficulty">{difficulty ?? 'all'}</output>
      <button onClick={() => onDifficultyChange('intermediate')}>filter-intermediate</button>
      <button onClick={() => onSongSelect('twinkle-twinkle')}>pick-song</button>
    </section>
  ),
}));

vi.mock('../features/practice/PracticeArea', () => ({
  default: () => <div data-testid="practice-area" />,
}));

vi.mock('./RandomPracticeView', () => ({
  RandomPracticeView: () => <div data-testid="random-practice" />,
}));

function ContentViewHarness({ initialRoute }: { initialRoute: AppContentRoute }) {
  const [route, setRoute] = useState(initialRoute);
  const [chatInput, setChatInput] = useState('');
  const actions = useMemo(
    () => ({
      selectClef: vi.fn(),
      toggleClef: vi.fn(),
      setPracticeRange: vi.fn(),
    }),
    []
  );

  const navigate = (nextRoute: AppContentRoute) => setRoute(nextRoute);

  return (
    <>
      <output data-testid="current-route">{JSON.stringify(route)}</output>
      <ContentView
        route={route}
        navigate={navigate}
        state={{ challenge: null } as never}
        derived={{ targetNote: null } as never}
        actions={actions as never}
        pressedKeys={new Map()}
        t={translations.zh}
        toggleLang={vi.fn()}
        chatInput={chatInput}
        setChatInput={setChatInput}
        chatHistory={[]}
        isLoadingAi={false}
        sendMessage={vi.fn()}
        chatEndRef={{ current: null }}
        lang="zh"
      />
    </>
  );
}

describe('ContentView route integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePracticeStore.setState({
      practiceMode: 'random',
      currentSongId: null,
      songProgress: 0,
      songTotalNotes: 0,
      songStartTime: null,
      challengeSequence: [],
      challengeIndex: 0,
      noteQueue: [],
    });
  });

  it('renders random practice from the route', () => {
    render(<ContentViewHarness initialRoute={{ kind: 'randomPractice' }} />);

    expect(screen.getByTestId('random-practice')).toBeTruthy();
  });

  it('writes a library filter change back to the typed route', () => {
    render(<ContentViewHarness initialRoute={{ kind: 'library' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'filter-intermediate' }));

    expect(screen.getByTestId('library-difficulty').textContent).toBe('intermediate');
    expect(screen.getByTestId('current-route').textContent).toBe(
      JSON.stringify({ kind: 'library', difficulty: 'intermediate' })
    );
  });

  it('navigates atomically from the library to a selected song', async () => {
    render(<ContentViewHarness initialRoute={{ kind: 'library' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'pick-song' }));

    expect(await screen.findByTestId('practice-area')).toBeTruthy();
    expect(screen.getByTestId('current-route').textContent).toBe(
      JSON.stringify({ kind: 'songPractice', songId: 'twinkle-twinkle' })
    );
  });

  it('mounts SongPractice from one route and synchronizes the legacy Practice adapter', async () => {
    render(
      <ContentViewHarness initialRoute={{ kind: 'songPractice', songId: 'twinkle-twinkle' }} />
    );

    await waitFor(() => {
      const store = usePracticeStore.getState();
      expect(store.practiceMode).toBe('song');
      expect(store.currentSongId).toBe('twinkle-twinkle');
      expect(store.songTotalNotes).toBeGreaterThan(0);
    });
  });
});
