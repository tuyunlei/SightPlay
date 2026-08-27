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
    expect(accepted.effects).toHaveLength(2);
    expect(accepted.effects[0]).toMatchObject({
      kind: 'attemptAccepted',
      hadMistake: true,
      score: 10,
      streak: 1,
      stats: { totalAttempts: 1, cleanHits: 0 },
    });
    expect(accepted.effects[1]).toMatchObject({ kind: 'schedule', effect: 'exitCleanup' });
  });

  it('separates transfer accuracy from rehearsed lesson performance', () => {
    const result = createFiniteExercise({
      source: 'lesson',
      id: 'test-lesson',
      clef: 'treble',
      frames: [
        { pitches: [60], role: 'guided' },
        { pitches: [62], role: 'transfer' },
      ],
    });
    if (!result.ok) throw new Error('invalid lesson plan');
    let state = createPracticeState(result.value, 0);

    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(60), at: 100 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(60), at: 120 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(64), at: 300 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(62), at: 320 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(62), at: 340 },
    });

    expect(state.roleStats.guided).toEqual({ totalAttempts: 1, cleanHits: 1 });
    expect(state.roleStats.transfer).toEqual({ totalAttempts: 1, cleanHits: 0 });
  });

  it('requires the complete chord before a target release can advance the frame', () => {
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
      observation: { kind: 'midiPressed', pitch: midi(60), at: 60 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(48), at: 70 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(48), at: 80 },
    });
    expect(state.cursor).toBe(1);
  });

  it('accepts consecutive notes without an input lockout', () => {
    let state = createPracticeState(plan(), 0);
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(60), at: 100 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(60), at: 120 },
    });
    expect(state.cursor).toBe(1);
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(62), at: 121 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(62), at: 130 },
    });

    expect(state).toMatchObject({ cursor: 2, stats: { totalAttempts: 2, cleanHits: 2 } });
  });

  it('accepts a simultaneous target and extra pitch as one dirty attempt', () => {
    let state = createPracticeState(plan(), 0);
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(60), at: 100 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(62), at: 110 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(62), at: 120 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(60), at: 130 },
    });
    expect(state).toMatchObject({ cursor: 1, stats: { totalAttempts: 1, cleanHits: 0 } });
  });

  it('does not reuse an overlapping extra pitch for the next frame', () => {
    let state = createPracticeState(plan(), 0);
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(60), at: 100 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiPressed', pitch: midi(62), at: 110 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(60), at: 120 },
    });
    state = apply(state, {
      kind: 'instrumentObserved',
      observation: { kind: 'midiReleased', pitch: midi(62), at: 130 },
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
      {
        kind: 'exerciseCompleted',
        epoch: completed.state.epoch,
        plan: single,
        score: 10,
        streak: 1,
        stats: { totalAttempts: 1, cleanHits: 1, bpm: 300 },
        completedAt: 1_120,
      },
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
