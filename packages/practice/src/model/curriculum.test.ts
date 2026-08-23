import { describe, expect, it } from 'vitest';

import { createCurriculumExercise, CURRICULUM_LESSONS } from './curriculum';

function exercise(lessonId: (typeof CURRICULUM_LESSONS)[number]['id'], seed: number) {
  const result = createCurriculumExercise({ lessonId, seed });
  if (!result.ok) throw new Error('invalid curriculum fixture');
  return result.value;
}

describe('Curriculum exercise generation', () => {
  it('replays every lesson exactly from its seed and keeps pitches inside the lesson range', () => {
    for (const lesson of CURRICULUM_LESSONS) {
      const first = exercise(lesson.id, 42);
      const replay = exercise(lesson.id, 42);

      expect(first).toEqual(replay);
      expect(new Set(first.frames.map((frame) => frame.role))).toEqual(
        new Set(['warmup', 'guided', 'familiar', 'transfer'])
      );
      expect(first.frames.every((frame) => frame.pitches.length === 1)).toBe(true);
      expect(
        new Set(first.frames.map((frame) => Number(frame.pitches[0]))).size
      ).toBeLessThanOrEqual(lesson.pitchCount);
    }
  });

  it('creates connected musical phrases instead of independent arbitrary notes', () => {
    for (const lesson of CURRICULUM_LESSONS.slice(0, 2)) {
      for (const seed of [0, 1, 42, 0xffffffff]) {
        const plan = exercise(lesson.id, seed);
        for (const role of ['guided', 'transfer'] as const) {
          const pitches = plan.frames
            .filter((frame) => frame.role === role)
            .map((frame) => Number(frame.pitches[0]));
          const intervals = pitches
            .slice(1)
            .map((pitch, index) => Math.abs(pitch - pitches[index]));
          expect(intervals.every((interval) => interval <= 2)).toBe(true);
          expect(lesson.id === 'landmark-steps' ? [60] : [60, 64]).toContain(pitches.at(-1));
        }
      }
    }
  });

  it('keeps the transfer phrase novel relative to the guided phrase', () => {
    for (const lesson of CURRICULUM_LESSONS) {
      for (let seed = 0; seed < 100; seed += 1) {
        const plan = exercise(lesson.id, seed);
        const phrase = (role: 'guided' | 'transfer') =>
          plan.frames.filter((frame) => frame.role === role).map((frame) => frame.pitches[0]);
        expect(phrase('transfer')).not.toEqual(phrase('guided'));
      }
    }
  });

  it('varies familiar material across seeds while preserving a recognizable constrained family', () => {
    for (const lesson of CURRICULUM_LESSONS) {
      const variants = new Set(
        [0, 1, 2, 3, 4, 5, 6, 7].map((seed) =>
          exercise(lesson.id, seed)
            .frames.filter((frame) => frame.role === 'familiar')
            .map((frame) => frame.pitches[0])
            .join(',')
        )
      );
      expect(variants.size).toBeGreaterThan(1);
    }
  });
});
