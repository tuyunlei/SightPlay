import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Profiler, useMemo, useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { translations } from '../i18n';
import { usePracticeStore } from '../store/practiceStore';

import { ContentView } from './ContentView';

const songLibrarySpy = vi.hoisted(() => ({
  renderCount: 0,
  lastOnSongSelect: null as null | ((id: string) => void),
}));

vi.mock('../features/library/SongLibrary', async () => {
  const React = await import('react');
  return {
    SongLibrary: React.memo(({ onSongSelect }: { onSongSelect: (id: string) => void }) => {
      songLibrarySpy.renderCount += 1;
      songLibrarySpy.lastOnSongSelect = onSongSelect;
      return (
        <button data-testid="mock-song-library" onClick={() => onSongSelect('twinkle-twinkle')}>
          pick-song
        </button>
      );
    }),
  };
});

vi.mock('../features/practice/PracticeArea', () => ({
  default: () => <div data-testid="practice-area" />,
}));

vi.mock('./RandomPracticeView', () => ({
  RandomPracticeView: () => <div data-testid="random-practice" />,
}));

type ViewMode = 'random' | 'library' | 'song-practice';

function ContentViewHarness({ initialMode = 'random' }: { initialMode?: ViewMode }) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(
    initialMode === 'song-practice' ? 'twinkle-twinkle' : null
  );
  const [showSongComplete, setShowSongComplete] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const actions = useMemo(
    () => ({
      toggleClef: vi.fn(),
      setPracticeRange: vi.fn(),
    }),
    []
  );

  const state = useMemo(() => ({ challenge: null }), []);
  const derived = useMemo(() => ({ targetNote: null }), []);

  return (
    <>
      <button data-testid="to-random" onClick={() => setViewMode('random')} />
      <button data-testid="to-library" onClick={() => setViewMode('library')} />
      <button
        data-testid="to-song"
        onClick={() => {
          setSelectedSongId('twinkle-twinkle');
          setViewMode('song-practice');
        }}
      />

      <ContentView
        viewMode={viewMode}
        selectedSongId={selectedSongId}
        showSongComplete={showSongComplete}
        setSelectedSongId={setSelectedSongId}
        setViewMode={setViewMode}
        setShowSongComplete={setShowSongComplete}
        state={state as never}
        derived={derived as never}
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

describe('ContentView integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    songLibrarySpy.renderCount = 0;
    songLibrarySpy.lastOnSongSelect = null;
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

  it('renders without render loops and supports mode switching', async () => {
    const renderCounter = { count: 0 };

    render(
      <Profiler id="content-view" onRender={() => (renderCounter.count += 1)}>
        <ContentViewHarness initialMode="random" />
      </Profiler>
    );

    await waitFor(() => expect(renderCounter.count).toBeGreaterThan(0));
    expect(renderCounter.count).toBeLessThan(15);

    fireEvent.click(screen.getByTestId('to-library'));
    expect(await screen.findByTestId('mock-song-library')).toBeTruthy();

    fireEvent.click(screen.getByTestId('to-song'));
    expect(await screen.findByTestId('practice-area')).toBeTruthy();
  });

  it('mounts SongPractice via ContentView and syncs store state', async () => {
    render(<ContentViewHarness initialMode="song-practice" />);

    fireEvent.click(screen.getByTestId('to-song'));

    await waitFor(() => {
      const store = usePracticeStore.getState();
      expect(store.practiceMode).toBe('song');
      expect(store.currentSongId).toBe('twinkle-twinkle');
      expect(store.songTotalNotes).toBeGreaterThan(0);
    });
  });

  it('keeps useCallback-wrapped SongLibrary callback stable across rerenders', () => {
    const Wrapper = () => {
      const [, force] = useState(0);
      const rerenderRef = useRef(() => force((n) => n + 1));
      return (
        <>
          <button data-testid="force-parent-rerender" onClick={() => rerenderRef.current()} />
          <ContentViewHarness initialMode="library" />
        </>
      );
    };

    render(<Wrapper />);

    const firstRef = songLibrarySpy.lastOnSongSelect;
    expect(firstRef).toBeTruthy();
    expect(songLibrarySpy.renderCount).toBe(1);

    fireEvent.click(screen.getByTestId('force-parent-rerender'));

    expect(songLibrarySpy.renderCount).toBe(1);
    expect(songLibrarySpy.lastOnSongSelect).toBe(firstRef);
  });
});
