import { describe, expect, it } from 'vitest';

import { createFiniteExercise, createMidiPitch } from './exercise';
import { createPracticeState, transitionPractice } from './transition';
import type { PracticeAction, PracticeState } from './types';

function plan(frames: readonly (readonly number[])[] = [[60], [62]]) {
  const result = createFiniteExercise({
    source: 'song',
    id: 'test-song',
    clef: 'treble',
    frames: frames.map((pitches) => ({ pitches })),
  });
  if (!result.ok) throw new Error('invalid test plan');
  return result.value;
}

function midi(value: number) {
  const pitch = createMidiPitch(value);
  if (pitch === null) throw new Error('invalid test pitch');
  return pitch;
}

function apply(state: PracticeState, action: PracticeAction): PracticeState {
  return transitionPractice(state, action).state;
}

describe('Practice transition', () => {
  it('accepts one MIDI target atomically and records a prior mistake', () => {
    let state = createPracticeState(plan(), 1_000);
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(61), at: 1_100 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(61), at: 1_120 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(60), at: 1_200 },
    });
    const accepted = transitionPractice(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(60), at: 1_220 },
    });

    expect(accepted.state).toMatchObject({
      cursor: 1,
      score: 10,
      streak: 1,
      stats: { totalAttempts: 1, cleanHits: 0 },
      heldPitches: [],
    });
    expect(accepted.effects).toHaveLength(1);
    expect(accepted.effects[0]).toMatchObject({ kind: 'schedule', effect: 'exitCleanup' });
  });

  it('requires the complete chord before release can advance the frame', () => {
    let state = createPracticeState(
      plan([
        [60, 48],
        [62, 50],
      ]),
      0
    );
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(60), at: 10 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(60), at: 20 },
    });
    expect(state.cursor).toBe(0);

    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(60), at: 30 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(48), at: 40 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(48), at: 50 },
    });
    expect(state.cursor).toBe(1);
  });

  it('requires a stable microphone observation and keeps transient wrong input clean', () => {
    let state = createPracticeState(plan(), 0);
    state = apply(state, { kind: 'microphoneStartRequested' });
    state = apply(state, { kind: 'microphoneStarted' });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'microphonePitch', pitch: midi(61), at: 10 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'microphonePitch', pitch: midi(60), at: 50 },
    });
    expect(state).toMatchObject({ cursor: 0, hadMistake: false });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'microphonePitch', pitch: midi(60), at: 130 },
    });
    expect(state).toMatchObject({ cursor: 1, stats: { totalAttempts: 1, cleanHits: 1 } });
  });

  it('emits completion once and rejects elapsed effects from an old exercise epoch', () => {
    const single = plan([[60]]);
    let state = createPracticeState(single, 0);
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(60), at: 100 },
    });
    const accepted = transitionPractice(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(60), at: 120 },
    });
    const completion = accepted.effects.find(
      (effect) => effect.kind === 'schedule' && effect.effect === 'completion'
    );
    if (!completion || completion.kind !== 'schedule') throw new Error('missing completion effect');

    const completed = transitionPractice(accepted.state, {
      kind: 'effectElapsed',
      epoch: completion.epoch,
      token: completion.token,
      effect: 'completion',
      now: 1_120,
    });
    expect(completed.state.completion.kind).toBe('completed');
    expect(completed.effects).toEqual([
      { kind: 'exerciseCompleted', epoch: completed.state.epoch, plan: single },
    ]);
    expect(
      transitionPractice(completed.state, {
        kind: 'effectElapsed',
        epoch: completion.epoch,
        token: completion.token,
        effect: 'completion',
        now: 2_000,
      }).effects
    ).toEqual([]);

    const replacement = transitionPractice(accepted.state, {
      kind: 'exerciseStarted',
      plan: plan([[64]]),
      now: 500,
    }).state;
    expect(
      transitionPractice(replacement, {
        kind: 'effectElapsed',
        epoch: completion.epoch,
        token: completion.token,
        effect: 'completion',
        now: 1_120,
      }).state
    ).toBe(replacement);
  });
});
