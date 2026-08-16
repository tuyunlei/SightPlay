import { describe, expect, it } from 'vitest';

import { createNoteFromMidi } from './public';

describe('createNoteFromMidi', () => {
  it('owns chromatic spelling, octave, and concert-pitch frequency', () => {
    expect(createNoteFromMidi(60)).toMatchObject({ name: 'C', octave: 4, midi: 60 });
    expect(createNoteFromMidi(61)).toMatchObject({ name: 'C#', octave: 4, midi: 61 });
    expect(createNoteFromMidi(69).frequency).toBe(440);
  });

  it('rejects values outside the MIDI identity domain', () => {
    expect(() => createNoteFromMidi(-1)).toThrow(RangeError);
    expect(() => createNoteFromMidi(128)).toThrow(RangeError);
    expect(() => createNoteFromMidi(60.5)).toThrow(RangeError);
  });
});
