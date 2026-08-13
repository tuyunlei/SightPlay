import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ProtectedAppRoute } from '@sightplay/app-shell';
import {
  PracticeProvider,
  createRandomExercise,
  type PracticePorts,
  usePractice,
} from '@sightplay/practice';

import { usePracticeRoute } from './usePracticeRoute';

function fixture() {
  const ports: PracticePorts = {
    clock: { now: () => 100 },
    scheduler: { schedule: () => vi.fn() },
    seed: { nextSeed: () => 2 },
    midi: { start: async () => {}, dispose: vi.fn() },
    microphone: { start: async () => {}, stop: vi.fn(), dispose: vi.fn() },
  };
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
  return { ports, plan: result.value };
}

describe('Practice route composition', () => {
  it('maps song and random routes to one live Practice runtime without a parallel owner', async () => {
    const test = fixture();
    const Wrapper = ({ children }: { children: ReactNode }) => {
      return (
        <PracticeProvider ports={test.ports} initialPlan={test.plan}>
          {children}
        </PracticeProvider>
      );
    };
    const { result } = renderHook(
      () => {
        const practice = usePractice();
        const [route, setRoute] = useState<ProtectedAppRoute>({
          kind: 'songPractice',
          songId: 'twinkle-twinkle',
        });
        usePracticeRoute(route, practice);
        return { practice, setRoute };
      },
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.practice.view.source).toBe('song'));
    expect(result.current.practice.view.metadata.id).toBe('twinkle-twinkle');

    act(() => result.current.setRoute({ kind: 'randomPractice' }));
    await waitFor(() => expect(result.current.practice.view.source).toBe('random'));
    expect(result.current.practice.view.totalCount).toBeNull();
  });
});
