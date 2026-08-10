import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { createNoteFromMidi } from '../domain/note';
import { initialPracticeState, PracticeEffect } from '../domain/practiceCore';

import { usePracticeStore } from './practiceStore';

describe('practiceStore reducer adapter', () => {
  beforeEach(() => {
    usePracticeStore.setState(initialPracticeState);
  });

  it('commits a pure reduction and returns its effects to the caller', () => {
    const target = createNoteFromMidi(60, 0);
    usePracticeStore.setState({ noteQueue: [target] });

    let effects: PracticeEffect[] = [];
    act(() => {
      effects = usePracticeStore.getState().dispatch({
        type: 'correctNoteAccepted',
        acceptedAt: 1_000,
        previousHitAt: 0,
        hadMistake: false,
        nextQueue: [],
        nextChallengeIndex: 0,
      });
    });

    expect(usePracticeStore.getState()).toMatchObject({ score: 10, streak: 1, noteQueue: [] });
    expect(effects).toEqual([{ type: 'scheduleExitCleanup', noteId: target.id, delayMs: 600 }]);
  });

  it('preserves unrelated practice state when session statistics reset', () => {
    const target = createNoteFromMidi(60, 0);
    usePracticeStore.setState({ noteQueue: [target], score: 50, streak: 3 });

    act(() => usePracticeStore.getState().resetStats());

    expect(usePracticeStore.getState()).toMatchObject({
      noteQueue: [target],
      score: 0,
      streak: 0,
      sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
    });
  });
});
