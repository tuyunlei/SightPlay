import { describe, expect, it } from 'vitest';

import { TIME_SIGNATURES } from '../../config/music';
import { Note } from '../../types';

import { shouldShowBarLine } from './barLine';

const makeNote = (index: number, duration?: Note['duration']): Note => ({
  id: `note-${index}`,
  name: 'C',
  octave: 4,
  frequency: 261.63,
  midi: 60,
  globalIndex: index,
  duration,
});

describe('shouldShowBarLine', () => {
  it('shows bar line every 4 quarter notes in 4/4', () => {
    const notes = Array.from({ length: 8 }, (_, i) => makeNote(i, 'quarter'));
    expect(shouldShowBarLine(notes, 4, TIME_SIGNATURES['4/4'])).toBe(true);
    expect(shouldShowBarLine(notes, 5, TIME_SIGNATURES['4/4'])).toBe(false);
  });

  it('uses quarter as default duration for backward compatibility', () => {
    const notes = Array.from({ length: 5 }, (_, i) => makeNote(i));
    expect(shouldShowBarLine(notes, 4, TIME_SIGNATURES['4/4'])).toBe(true);
  });

  it('handles mixed durations in 4/4', () => {
    const notes = [
      makeNote(0, 'half'),
      makeNote(1, 'quarter'),
      makeNote(2, 'quarter'),
      makeNote(3, 'eighth'),
    ];

    expect(shouldShowBarLine(notes, 3, TIME_SIGNATURES['4/4'])).toBe(true);
    expect(shouldShowBarLine(notes, 2, TIME_SIGNATURES['4/4'])).toBe(false);
  });

  it('supports 6/8 where one measure equals 3 quarter beats', () => {
    const notes = [
      makeNote(0, 'quarter'),
      makeNote(1, 'quarter'),
      makeNote(2, 'quarter'),
      makeNote(3, 'eighth'),
    ];

    expect(shouldShowBarLine(notes, 2, TIME_SIGNATURES['6/8'])).toBe(false);
    expect(shouldShowBarLine(notes, 3, TIME_SIGNATURES['6/8'])).toBe(true);
  });

  it('returns false for index 0 or invalid index', () => {
    const notes = [makeNote(0, 'whole')];
    expect(shouldShowBarLine(notes, 0, TIME_SIGNATURES['4/4'])).toBe(false);
    expect(shouldShowBarLine(notes, 1, TIME_SIGNATURES['4/4'])).toBe(false);
  });
});
