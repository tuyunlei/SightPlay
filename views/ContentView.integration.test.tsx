import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AppContentRoute } from '@sightplay/app-shell';
import { GuidanceProvider, type GuidancePorts } from '@sightplay/guidance';
import { createRandomExercise, PracticeProvider, type PracticePorts } from '@sightplay/practice';

import { translations } from '../i18n';

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
  const [guidancePorts] = useState<GuidancePorts>(() => ({
    clock: { now: () => 0 },
    scheduler: { schedule: () => vi.fn() },
    chat: {
      request: async () => ({
        ok: true,
        reply: { replyText: 'test', challengeData: null },
      }),
    },
  }));
  const [ports] = useState<PracticePorts>(() => ({
    clock: { now: () => 0 },
    scheduler: { schedule: () => vi.fn() },
    seed: { nextSeed: () => 2 },
    midi: { start: async () => {}, dispose: vi.fn() },
    microphone: { start: async () => {}, stop: vi.fn(), dispose: vi.fn() },
  }));
  const [plan] = useState(() => {
    const result = createRandomExercise({
      seed: 1,
      config: {
        clef: 'treble',
        practiceRange: 'combined',
        handMode: 'right-hand',
        includeAccidentals: false,
      },
    });
    if (!result.ok) throw new Error('invalid fixture');
    return result.value;
  });

  const navigate = (nextRoute: AppContentRoute) => setRoute(nextRoute);

  return (
    <>
      <output data-testid="current-route">{JSON.stringify(route)}</output>
      <GuidanceProvider ports={guidancePorts} initialContext={{ clef: 'treble', language: 'zh' }}>
        <PracticeProvider ports={ports} initialPlan={plan}>
          <ContentView
            route={route}
            navigate={navigate}
            dismissEntry={navigate}
            t={translations.zh}
            toggleLang={vi.fn()}
          />
        </PracticeProvider>
      </GuidanceProvider>
    </>
  );
}

describe('ContentView route integration', () => {
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

  it('navigates atomically from the library to a selected song', () => {
    render(<ContentViewHarness initialRoute={{ kind: 'library' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'pick-song' }));

    expect(screen.getByTestId('practice-area')).toBeTruthy();
    expect(screen.getByTestId('current-route').textContent).toBe(
      JSON.stringify({ kind: 'songPractice', songId: 'twinkle-twinkle' })
    );
  });
});
