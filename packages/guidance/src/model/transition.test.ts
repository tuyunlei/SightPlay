import { describe, expect, it } from 'vitest';

import { createGuidanceState, transitionGuidance } from './transition';
import type { GuidanceAction, GuidanceState, PracticeGuidanceObservation } from './types';

const context = { clef: 'treble', language: 'en' } as const;

function apply(state: GuidanceState, action: GuidanceAction): GuidanceState {
  return transitionGuidance(state, action).state;
}

function attempt(
  overrides: Partial<Extract<PracticeGuidanceObservation, { kind: 'attemptAccepted' }>> = {}
): Extract<PracticeGuidanceObservation, { kind: 'attemptAccepted' }> {
  return {
    kind: 'attemptAccepted',
    contextId: 'random:session',
    at: 100_000,
    source: 'random',
    clef: 'treble',
    range: 'central',
    totalAttempts: 1,
    cleanHits: 1,
    streak: 1,
    hadMistake: false,
    ...overrides,
  };
}

function completed(): Extract<PracticeGuidanceObservation, { kind: 'exerciseCompleted' }> {
  return {
    kind: 'exerciseCompleted',
    contextId: 'coach:session',
    at: 100_000,
    source: 'coach',
    clef: 'treble',
    range: 'combined',
    totalAttempts: 3,
    cleanHits: 3,
    streak: 3,
  };
}

describe('Guidance transition', () => {
  it('admits one trimmed message and ignores stale provider results', () => {
    const initial = createGuidanceState(context);
    const submitted = transitionGuidance(initial, {
      kind: 'messageSubmitted',
      text: '  Help me read notes  ',
    });
    expect(submitted.state.pendingConversation).toBe(1);
    expect(submitted.effects).toEqual([
      {
        kind: 'requestChat',
        purpose: 'conversation',
        operation: 1,
        message: 'Help me read notes',
        context,
      },
    ]);
    expect(
      transitionGuidance(submitted.state, {
        kind: 'messageSubmitted',
        text: 'second request',
      }).state
    ).toBe(submitted.state);
    expect(
      transitionGuidance(submitted.state, {
        kind: 'chatResolved',
        operation: 99,
        result: { ok: true, reply: { replyText: 'stale', challengeData: null } },
      }).state
    ).toBe(submitted.state);
  });

  it('validates a proposal before emitting it and owns structured failure recovery', () => {
    const submitted = apply(createGuidanceState(context), {
      kind: 'messageSubmitted',
      text: 'Give me a scale',
    });
    const resolved = transitionGuidance(submitted, {
      kind: 'chatResolved',
      operation: 1,
      result: {
        ok: true,
        reply: {
          replyText: 'Try this.',
          challengeData: {
            title: 'C scale',
            description: 'Ascending',
            notes: ['C4', 'D4'],
          },
        },
      },
    });
    expect(resolved.state.pendingConversation).toBeNull();
    expect(resolved.effects).toEqual([
      {
        kind: 'emit',
        output: {
          kind: 'exerciseProposed',
          proposal: {
            title: 'C scale',
            description: 'Ascending',
            notes: ['C4', 'D4'],
          },
        },
      },
    ]);
    expect(resolved.state.messages.at(-1)?.content).toEqual({
      kind: 'exerciseLoaded',
      title: 'C scale',
      count: 2,
    });

    const invalid = transitionGuidance(submitted, {
      kind: 'chatResolved',
      operation: 1,
      result: {
        ok: true,
        reply: {
          replyText: 'Broken',
          challengeData: { title: 'Bad', description: 'Bad', notes: ['H9'] },
        },
      },
    });
    expect(invalid.effects).toEqual([]);
    expect(invalid.state.messages.at(-1)?.content).toEqual({ kind: 'connectionFailure' });
  });

  it('turns accepted attempts into deterministic hints with model-owned fallback and timer', () => {
    let state = createGuidanceState(context);
    state = apply(state, {
      kind: 'practiceObserved',
      observation: attempt({ totalAttempts: 1, cleanHits: 0, streak: 0, hadMistake: true }),
    });
    state = apply(state, {
      kind: 'practiceObserved',
      observation: attempt({ totalAttempts: 2, cleanHits: 0, streak: 0, hadMistake: true }),
    });
    const triggered = transitionGuidance(state, {
      kind: 'practiceObserved',
      observation: attempt({ totalAttempts: 3, cleanHits: 0, streak: 0, hadMistake: true }),
    });
    expect(triggered.effects[0]).toMatchObject({ kind: 'requestChat', purpose: 'tip' });
    const operation = triggered.state.pendingHint?.operation;
    if (!operation) throw new Error('missing hint operation');

    const fallback = transitionGuidance(triggered.state, {
      kind: 'hintResolved',
      operation,
      type: 'tip',
      result: { ok: false, failure: 'providerUnavailable' },
      now: 100_000,
    });
    expect(fallback.state.hint?.content).toEqual({ kind: 'local', message: 'keepGoing' });
    expect(fallback.effects).toEqual([{ kind: 'scheduleHintDismiss', token: 1, delayMs: 5_000 }]);
    expect(transitionGuidance(fallback.state, { kind: 'hintTimerElapsed', token: 99 }).state).toBe(
      fallback.state
    );
    expect(
      transitionGuidance(fallback.state, { kind: 'hintTimerElapsed', token: 1 }).state.hint
    ).toBeNull();
  });

  it('does not request invisible contextual hints for song or coach exercises', () => {
    const initial = createGuidanceState(context);
    const songStreak = transitionGuidance(initial, {
      kind: 'practiceObserved',
      observation: attempt({
        contextId: 'song:session',
        source: 'song',
        totalAttempts: 5,
        cleanHits: 5,
        streak: 5,
      }),
    });
    const coachMistake = transitionGuidance(songStreak.state, {
      kind: 'practiceObserved',
      observation: attempt({
        contextId: 'coach:session',
        source: 'coach',
        totalAttempts: 3,
        cleanHits: 0,
        streak: 0,
        hadMistake: true,
      }),
    });

    expect(songStreak.effects).toEqual([]);
    expect(coachMistake.effects).toEqual([]);
    expect(coachMistake.state.pendingHint).toBeNull();
  });

  it('emits the exact recommendation payload and preserves dismissal within one context', () => {
    const observed = transitionGuidance(createGuidanceState(context), {
      kind: 'practiceObserved',
      observation: attempt({ totalAttempts: 25, cleanHits: 24, streak: 4 }),
    });
    expect(observed.state.recommendations.map(({ id }) => id)).toEqual([
      'clef-try-bass',
      'range-expand',
    ]);
    const applied = transitionGuidance(observed.state, {
      kind: 'recommendationApplied',
      id: 'clef-try-bass',
    });
    expect(applied.effects).toEqual([
      {
        kind: 'emit',
        output: { kind: 'recommendationApplied', action: { kind: 'selectClef', clef: 'bass' } },
      },
    ]);
    const repeated = transitionGuidance(applied.state, {
      kind: 'practiceObserved',
      observation: attempt({ totalAttempts: 26, cleanHits: 25, streak: 5 }),
    });
    expect(repeated.state.recommendations.some(({ id }) => id === 'clef-try-bass')).toBe(false);
  });

  it('owns coach-exercise completion feedback instead of delegating policy to React', () => {
    const completedExercise = transitionGuidance(createGuidanceState(context), {
      kind: 'practiceObserved',
      observation: completed(),
    });

    expect(completedExercise.state.messages.at(-1)?.content).toEqual({
      kind: 'exerciseCompletedNotice',
    });
    expect(completedExercise.effects).toEqual([
      {
        kind: 'requestChat',
        purpose: 'conversation',
        operation: 1,
        message: 'I completed the sight-reading exercise. Give me one short piece of feedback.',
        context,
      },
    ]);
  });
});
