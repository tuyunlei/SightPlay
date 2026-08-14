import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { GuidanceProvider, type GuidancePorts } from '@sightplay/guidance';
import {
  createRandomExercise,
  PracticeProvider,
  type PracticePorts,
  usePractice,
} from '@sightplay/practice';
import { PreferencesProvider } from '@sightplay/preferences';

import { RandomPracticeView } from './RandomPracticeView';
import { useLanguage } from './useLanguage';

function PracticeProbe() {
  const { view } = usePractice();
  return (
    <output data-testid="practice-probe">
      {JSON.stringify({
        handMode: view.handMode,
        practiceRange: view.practiceRange,
        pitches: view.noteQueue
          .slice(0, view.handMode === 'both-hands' ? 2 : 1)
          .map((note) => note.midi),
      })}
    </output>
  );
}

function LocalizedPractice() {
  const { t, toggleLanguage } = useLanguage();
  return (
    <>
      <RandomPracticeView t={t} toggleLang={toggleLanguage} />
      <PracticeProbe />
    </>
  );
}

function Harness() {
  const [guidancePorts] = useState<GuidancePorts>(() => ({
    clock: { now: () => 0 },
    scheduler: { schedule: () => vi.fn() },
    chat: {
      request: async () => ({ ok: false as const, failure: 'providerUnavailable' as const }),
    },
  }));
  const [practicePorts] = useState<PracticePorts>(() => ({
    clock: { now: () => 0 },
    scheduler: { schedule: () => vi.fn() },
    seed: { nextSeed: () => 7 },
    midi: { start: async () => {}, dispose: vi.fn() },
    microphone: { start: async () => {}, stop: vi.fn(), dispose: vi.fn() },
  }));
  const [plan] = useState(() => {
    const result = createRandomExercise({
      seed: 7,
      config: {
        clef: 'treble',
        practiceRange: 'combined',
        handMode: 'right-hand',
        includeAccidentals: false,
      },
    });
    if (!result.ok) throw new Error('invalid Practice fixture');
    return result.value;
  });

  return (
    <PreferencesProvider initialLanguage="en">
      <GuidanceProvider ports={guidancePorts} initialContext={{ clef: 'treble', language: 'en' }}>
        <PracticeProvider ports={practicePorts} initialPlan={plan}>
          <LocalizedPractice />
        </PracticeProvider>
      </GuidanceProvider>
    </PreferencesProvider>
  );
}

function probe() {
  return JSON.parse(screen.getByTestId('practice-probe').textContent ?? '{}') as {
    handMode: string;
    practiceRange: string;
    pitches: number[];
  };
}

describe('RandomPracticeView assembled intents', () => {
  it('changes hand and range through the real Preferences/Practice projections', async () => {
    render(<Harness />);
    await screen.findByTestId('practice-probe');

    fireEvent.click(screen.getByRole('button', { name: 'Both Hands' }));
    await waitFor(() => expect(probe().handMode).toBe('both-hands'));
    expect(probe().pitches).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Middle Octave' }));
    await waitFor(() => expect(probe().practiceRange).toBe('central'));
  });

  it('projects a language preference change without a global mutable store', async () => {
    render(<Harness />);
    expect(await screen.findByText('SightPlay')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(await screen.findByText('视弹 SightPlay')).toBeTruthy();
  });
});
