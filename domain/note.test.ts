import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createNoteFromMidi, noteStringToMidi } from './note';

describe('note', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-1234',
    });
  });

  describe('createNoteFromMidi', () => {
    it('creates C4 (middle C) correctly', () => {
      const note = createNoteFromMidi(60, 0);
      expect(note.name).toBe('C');
      expect(note.octave).toBe(4);
      expect(note.midi).toBe(60);
      expect(note.globalIndex).toBe(0);
      expect(note.frequency).toBeCloseTo(261.63, 1);
    });

    it('creates A4 (440Hz) correctly', () => {
      const note = createNoteFromMidi(69, 1);
      expect(note.name).toBe('A');
      expect(note.octave).toBe(4);
      expect(note.midi).toBe(69);
      expect(note.frequency).toBe(440);
    });

    it('creates sharp notes correctly', () => {
      const cSharp = createNoteFromMidi(61, 0);
      expect(cSharp.name).toBe('C#');
      expect(cSharp.octave).toBe(4);

      const fSharp = createNoteFromMidi(66, 0);
      expect(fSharp.name).toBe('F#');
      expect(fSharp.octave).toBe(4);
    });

    it('handles low octaves correctly', () => {
      const note = createNoteFromMidi(36, 0); // C2
      expect(note.name).toBe('C');
      expect(note.octave).toBe(2);
    });

    it('handles high octaves correctly', () => {
      const note = createNoteFromMidi(84, 0); // C6
      expect(note.name).toBe('C');
      expect(note.octave).toBe(6);
    });

    it('uses default globalIndex of 0', () => {
      const note = createNoteFromMidi(60);
      expect(note.globalIndex).toBe(0);
    });

    it('accepts optional duration', () => {
      const note = createNoteFromMidi(60, 2, 'half');
      expect(note.duration).toBe('half');
      expect(note.globalIndex).toBe(2);
    });

    it('keeps duration undefined for backward compatibility', () => {
      const note = createNoteFromMidi(60, 2);
      expect(note.duration).toBeUndefined();
    });

    it('generates unique ids', () => {
      const note = createNoteFromMidi(60, 0);
      expect(note.id).toBe('test-uuid-1234');
    });

    it('calculates frequency for all chromatic notes', () => {
      // Test all 12 notes in an octave
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      for (let i = 0; i < 12; i++) {
        const note = createNoteFromMidi(60 + i, i);
        expect(note.name).toBe(noteNames[i]);
      }
    });

    it('creates flat notes when preferFlat is true', () => {
      const dFlat = createNoteFromMidi(61, 0, undefined, true);
      expect(dFlat.name).toBe('Db');
      expect(dFlat.octave).toBe(4);
      expect(dFlat.midi).toBe(61);

      const eFlat = createNoteFromMidi(63, 0, undefined, true);
      expect(eFlat.name).toBe('Eb');

      const gFlat = createNoteFromMidi(66, 0, undefined, true);
      expect(gFlat.name).toBe('Gb');

      const aFlat = createNoteFromMidi(68, 0, undefined, true);
      expect(aFlat.name).toBe('Ab');

      const bFlat = createNoteFromMidi(70, 0, undefined, true);
      expect(bFlat.name).toBe('Bb');
    });

    it('creates sharp notes when preferFlat is false (default)', () => {
      const cSharp = createNoteFromMidi(61, 0, undefined, false);
      expect(cSharp.name).toBe('C#');

      const cSharpDefault = createNoteFromMidi(61, 0);
      expect(cSharpDefault.name).toBe('C#');
    });

    it('creates natural notes regardless of preferFlat', () => {
      const cNatural = createNoteFromMidi(60, 0, undefined, true);
      expect(cNatural.name).toBe('C');

      const eNatural = createNoteFromMidi(64, 0, undefined, true);
      expect(eNatural.name).toBe('E');
    });
  });

  describe('noteStringToMidi', () => {
    it('parses C4 correctly', () => {
      expect(noteStringToMidi('C4')).toBe(60);
    });

    it('parses A4 correctly', () => {
      expect(noteStringToMidi('A4')).toBe(69);
    });

    it('parses sharp notes correctly', () => {
      expect(noteStringToMidi('C#4')).toBe(61);
      expect(noteStringToMidi('F#4')).toBe(66);
      expect(noteStringToMidi('G#3')).toBe(56);
    });

    it('parses low octaves correctly', () => {
      expect(noteStringToMidi('C2')).toBe(36);
      expect(noteStringToMidi('A0')).toBe(21);
    });

    it('parses high octaves correctly', () => {
      expect(noteStringToMidi('C6')).toBe(84);
      expect(noteStringToMidi('C8')).toBe(108);
    });

    it('parses negative octaves correctly', () => {
      expect(noteStringToMidi('C-1')).toBe(0);
    });

    it('returns null for invalid input', () => {
      expect(noteStringToMidi('')).toBeNull();
      expect(noteStringToMidi('X4')).toBeNull();
      expect(noteStringToMidi('C')).toBeNull();
      expect(noteStringToMidi('4')).toBeNull();
      expect(noteStringToMidi('Cb4')).toBeNull(); // flats not supported
      expect(noteStringToMidi('c4')).toBeNull(); // lowercase
    });

    it('returns null for malformed strings', () => {
      expect(noteStringToMidi('CC4')).toBeNull();
      expect(noteStringToMidi('C#')).toBeNull();
    });

    it('parses extreme octaves as valid', () => {
      // C44 is technically valid format (just very high octave)
      expect(noteStringToMidi('C44')).toBe(540);
    });

    it('handles all note names', () => {
      const expected = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];
      const noteStrings = [
        'C4',
        'C#4',
        'D4',
        'D#4',
        'E4',
        'F4',
        'F#4',
        'G4',
        'G#4',
        'A4',
        'A#4',
        'B4',
      ];
      noteStrings.forEach((str, i) => {
        expect(noteStringToMidi(str)).toBe(expected[i]);
      });
    });

    it('round-trips with createNoteFromMidi', () => {
      const testCases = ['C4', 'D#5', 'G3', 'A4', 'B2'];
      testCases.forEach((noteStr) => {
        const midi = noteStringToMidi(noteStr);
        expect(midi).not.toBeNull();
        const note = createNoteFromMidi(midi!, 0);
        // Reconstruct the note string
        const reconstructed = `${note.name}${note.octave}`;
        expect(reconstructed).toBe(noteStr);
      });
    });
  });
});
