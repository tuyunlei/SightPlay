import { describe, expect, it } from 'vitest';

import { createSongExercise } from './createExercisePlan';

describe('createSongExercise', () => {
  it('preserves simultaneous pitches and both-hand display for a song frame', () => {
    const exercise = createSongExercise('canon-in-d-two-hands');

    expect(exercise?.handMode).toBe('both-hands');
    expect(exercise?.frames).toHaveLength(8);
    expect(exercise?.frames[0].pitches.map(Number)).toEqual([48, 64]);
    expect(exercise?.frames.every((frame) => frame.pitches.length === 2)).toBe(true);
  });

  it('keeps the established Canon route playable', () => {
    const exercise = createSongExercise('canon-in-d');

    expect(exercise?.metadata.id).toBe('canon-in-d');
    expect(exercise?.handMode).toBe('right-hand');
    expect(exercise?.frames).toHaveLength(8);
  });
});
