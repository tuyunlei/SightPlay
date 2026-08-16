import { describe, expect, it } from 'vitest';

import { createFiniteExercise, createMidiPitch, frameAt } from './exercise';
import { createPracticeState, transitionPractice } from './transition';
import { asEffectToken, type PracticeAction, type PracticeState } from './types';

function exercise() {
  const result = createFiniteExercise({
    source: 'song',
    id: 'invariant-song',
    clef: 'treble',
    frames: [{ pitches: [60] }, { pitches: [62, 50] }, { pitches: [64] }],
  });
  if (!result.ok) throw new Error('invalid invariant exercise');
  return result.value;
}

function assertInvariants(state: PracticeState): void {
  const total = state.plan.kind === 'finite' ? state.plan.frames.length : null;
  expect(Number(state.epoch)).toBeGreaterThan(0);
  expect(state.cursor).toBeGreaterThanOrEqual(0);
  if (total !== null) expect(state.cursor).toBeLessThanOrEqual(total);
  expect(state.score).toBeGreaterThanOrEqual(0);
  expect(state.streak).toBeGreaterThanOrEqual(0);
  expect(state.stats.totalAttempts).toBeGreaterThanOrEqual(0);
  expect(state.stats.cleanHits).toBeGreaterThanOrEqual(0);
  expect(state.stats.cleanHits).toBeLessThanOrEqual(state.stats.totalAttempts);
  expect(new Set(state.heldPitches.map(({ pitch }) => pitch)).size).toBe(state.heldPitches.length);
  expect(new Set(state.pendingEffects.map(({ token }) => token)).size).toBe(
    state.pendingEffects.length
  );
  expect(new Set(state.exitingFrames.map(({ id }) => id)).size).toBe(state.exitingFrames.length);
  expect(state.pendingEffects.every(({ token }) => token <= state.nextToken)).toBe(true);

  const target = frameAt(state.plan, state.cursor);
  if (state.matchedFrameId !== null) expect(state.matchedFrameId).toBe(target?.id);
  if (state.completion.kind === 'pending') {
    const completionToken = state.completion.token;
    expect(total).not.toBeNull();
    expect(state.cursor).toBe(total);
    expect(
      state.pendingEffects.some(
        ({ token, effect }) => token === completionToken && effect === 'completion'
      )
    ).toBe(true);
  }
  if (state.completion.kind === 'completed') {
    expect(total).not.toBeNull();
    expect(state.cursor).toBe(total);
  }
  if (total !== null && state.cursor < total) expect(state.completion.kind).toBe('active');
}

function nextRandom(seed: number): number {
  let value = seed >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

function observedAction(state: PracticeState, random: number, now: number): PracticeAction {
  const target = frameAt(state.plan, state.cursor);
  const targetPitch =
    target?.pitches[random % (target?.pitches.length ?? 1)] ?? createMidiPitch(60);
  const arbitraryPitch = createMidiPitch(48 + (random % 36));
  if (targetPitch === null || arbitraryPitch === null) throw new Error('invalid generated pitch');

  switch (random % 11) {
    case 0:
      return {
        kind: 'instrumentObserved',
        observation: { kind: 'midiPressed', pitch: targetPitch, at: now },
      };
    case 1:
      return {
        kind: 'instrumentObserved',
        observation: { kind: 'midiReleased', pitch: targetPitch, at: now },
      };
    case 2:
      return {
        kind: 'instrumentObserved',
        observation: { kind: 'midiPressed', pitch: arbitraryPitch, at: now },
      };
    case 3:
      return {
        kind: 'instrumentObserved',
        observation: { kind: 'microphonePitch', pitch: targetPitch, at: now },
      };
    case 4:
      return { kind: 'microphoneStartRequested' };
    case 5:
      return { kind: 'microphoneStarted' };
    case 6:
      return { kind: 'microphoneStartFailed' };
    case 7:
      return { kind: 'microphoneStopped' };
    case 8:
      return { kind: 'statsReset', now };
    case 9:
      return {
        kind: 'instrumentObserved',
        observation: { kind: 'midiConnectionChanged', connected: random % 2 === 0, at: now },
      };
    default:
      return {
        kind: 'effectElapsed',
        epoch: state.epoch,
        token: state.pendingEffects[0]?.token ?? asEffectToken(random),
        effect: state.pendingEffects[0]?.effect ?? 'exitCleanup',
        now,
      };
  }
}

describe('Practice transition invariants', () => {
  it('preserves the state contract across deterministic mixed action sequences', () => {
    for (let sequence = 1; sequence <= 64; sequence += 1) {
      let random = sequence;
      let now = 0;
      let state = createPracticeState(exercise(), now);
      assertInvariants(state);

      for (let step = 0; step < 256; step += 1) {
        random = nextRandom(random + step);
        now += random % 200;
        state = transitionPractice(state, observedAction(state, random, now)).state;
        assertInvariants(state);
      }
    }
  }, 10_000);
});
