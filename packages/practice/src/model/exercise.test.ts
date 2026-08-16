import { describe, expect, it } from 'vitest';

import { createFiniteExercise, createRandomExercise, frameAt } from './exercise';
import type { RandomExerciseConfig } from './types';

const randomConfig = {
  clef: 'treble',
  practiceRange: 'combined',
  handMode: 'right-hand',
  includeAccidentals: false,
} as const;

describe('Exercise plans', () => {
  it('rejects empty and invalid finite exercises before they enter Practice', () => {
    expect(
      createFiniteExercise({ source: 'song', id: 'song', clef: 'treble', frames: [] })
    ).toEqual({ ok: false, issue: 'invalidExercise' });
    expect(
      createFiniteExercise({
        source: 'coach',
        id: 'coach',
        clef: 'treble',
        frames: [{ pitches: [60, 128] }],
      })
    ).toEqual({ ok: false, issue: 'invalidExercise' });
    expect(
      createFiniteExercise({
        source: 'coach',
        id: 'duplicate-chord',
        clef: 'treble',
        frames: [{ pitches: [60, 60] }],
      })
    ).toEqual({ ok: false, issue: 'invalidExercise' });
  });

  it('reproduces generated frames from the recorded seed and configuration', () => {
    const first = createRandomExercise({ seed: 42, config: randomConfig });
    const replay = createRandomExercise({ seed: 42, config: randomConfig });
    expect(first.ok && replay.ok).toBe(true);
    if (!first.ok || !replay.ok) return;

    expect(Array.from({ length: 40 }, (_, index) => frameAt(first.value, index))).toEqual(
      Array.from({ length: 40 }, (_, index) => frameAt(replay.value, index))
    );
  });

  it('keeps generated identifiers stable while allowing accidental policy to change pitches', () => {
    const natural = createRandomExercise({ seed: 1, config: randomConfig });
    const chromatic = createRandomExercise({
      seed: 1,
      config: { ...randomConfig, includeAccidentals: true },
    });
    expect(natural.ok && chromatic.ok).toBe(true);
    if (!natural.ok || !chromatic.ok) return;

    const naturalFrames = Array.from({ length: 50 }, (_, index) => frameAt(natural.value, index));
    const chromaticFrames = Array.from({ length: 50 }, (_, index) =>
      frameAt(chromatic.value, index)
    );
    expect(chromaticFrames.map((frame) => frame?.id)).toEqual(
      naturalFrames.map((frame) => frame?.id)
    );
    expect(
      chromaticFrames.some((frame, index) => frame?.pitches[0] !== naturalFrames[index]?.pitches[0])
    ).toBe(true);
    expect(
      naturalFrames.every((frame) => ![1, 3, 6, 8, 10].includes(Number(frame?.pitches[0]) % 12))
    ).toBe(true);
  });

  it('keeps every generated frame inside its decoded hand contract across seeds', () => {
    const seeds = [0, 1, 42, 0x7fffffff, 0xffffffff];
    const configs: readonly RandomExerciseConfig[] = [
      randomConfig,
      { ...randomConfig, clef: 'bass', handMode: 'left-hand' },
      { ...randomConfig, handMode: 'both-hands', includeAccidentals: true },
    ];

    for (const seed of seeds) {
      for (const config of configs) {
        const exercise = createRandomExercise({ seed, config });
        expect(exercise.ok).toBe(true);
        if (!exercise.ok) continue;

        for (let index = 0; index < 128; index += 1) {
          const frame = frameAt(exercise.value, index);
          expect(frame).not.toBeNull();
          if (!frame) continue;
          expect(new Set(frame.pitches).size).toBe(frame.pitches.length);
          expect(frame.pitches.every((pitch) => pitch >= 0 && pitch <= 127)).toBe(true);
          if (config.handMode === 'both-hands') {
            expect(frame.pitches).toHaveLength(2);
            expect(frame.pitches[0]).toBeGreaterThanOrEqual(60);
            expect(frame.pitches[1]).toBeLessThan(60);
          }
        }
      }
    }
  });
});
