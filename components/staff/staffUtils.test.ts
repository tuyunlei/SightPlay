import { beforeEach, describe, expect, it } from 'vitest';

import { createNoteFromMidi } from '../../domain/note';
import { Note } from '../../types';

import { createStaffLayout, StaffLayout } from './staffLayout';
import { getAccidental, getNoteY, getStaffSteps, isFlat, isSharp } from './staffUtils';

describe('staffUtils', () => {
  describe('getStaffSteps', () => {
    it('should return 0 when midi equals centerMidi', () => {
      expect(getStaffSteps(createNoteFromMidi(60), 60)).toBe(0);
      expect(getStaffSteps(createNoteFromMidi(71), 71)).toBe(0);
    });

    it('should calculate correct steps for diatonic scale', () => {
      const centerMidi = 60;
      const steps = [0, 1, 2, 3, 4, 5, 6, 7];
      const midis = [60, 62, 64, 65, 67, 69, 71, 72];
      midis.forEach((midi, i) => {
        expect(getStaffSteps(createNoteFromMidi(midi), centerMidi)).toBe(steps[i]);
      });
    });

    it('should calculate negative steps for notes below center', () => {
      const centerMidi = 60;
      const steps = [-1, -2, -3, -4, -5, -6, -7];
      const midis = [59, 57, 55, 53, 52, 50, 48];
      midis.forEach((midi, i) => {
        expect(getStaffSteps(createNoteFromMidi(midi), centerMidi)).toBe(steps[i]);
      });
    });

    it('should position sharps at the note below', () => {
      const centerMidi = 60;
      expect(getStaffSteps(createNoteFromMidi(61, 0, undefined, false), centerMidi)).toBe(0); // C#
      expect(getStaffSteps(createNoteFromMidi(63, 0, undefined, false), centerMidi)).toBe(1); // D#
      expect(getStaffSteps(createNoteFromMidi(66, 0, undefined, false), centerMidi)).toBe(3); // F#
    });

    it('should position flats at the note above', () => {
      const centerMidi = 60;
      expect(getStaffSteps(createNoteFromMidi(61, 0, undefined, true), centerMidi)).toBe(1); // Db
      expect(getStaffSteps(createNoteFromMidi(63, 0, undefined, true), centerMidi)).toBe(2); // Eb
      expect(getStaffSteps(createNoteFromMidi(66, 0, undefined, true), centerMidi)).toBe(4); // Gb
    });

    it('should handle extreme ranges and different centers', () => {
      expect(getStaffSteps(createNoteFromMidi(108), 60)).toBe(28);
      expect(getStaffSteps(createNoteFromMidi(24), 60)).toBe(-21);
      expect(getStaffSteps(createNoteFromMidi(72), 71)).toBe(1);
      expect(getStaffSteps(createNoteFromMidi(69), 71)).toBe(-1);
    });
  });

  describe('getNoteY', () => {
    let layout: StaffLayout;

    beforeEach(() => {
      layout = createStaffLayout(1000);
    });

    it('should place center note at STAFF_CENTER_Y', () => {
      const y = getNoteY(createNoteFromMidi(71), 71, layout);
      expect(y).toBe(layout.STAFF_CENTER_Y);
    });

    it('should place notes above center at lower Y values', () => {
      const centerMidi = 71;
      const y1 = getNoteY(createNoteFromMidi(72), centerMidi, layout);
      const y2 = getNoteY(createNoteFromMidi(74), centerMidi, layout);

      expect(y1).toBeLessThan(layout.STAFF_CENTER_Y);
      expect(y2).toBeLessThan(y1);
      expect(y1).toBe(layout.STAFF_CENTER_Y - layout.STAFF_HALF_SPACE);
    });

    it('should place notes below center at higher Y values', () => {
      const centerMidi = 71;
      const y1 = getNoteY(createNoteFromMidi(69), centerMidi, layout);
      const y2 = getNoteY(createNoteFromMidi(67), centerMidi, layout);

      expect(y1).toBeGreaterThan(layout.STAFF_CENTER_Y);
      expect(y2).toBeGreaterThan(y1);
    });

    it('should place Db at D position (not C position)', () => {
      const centerMidi = 60;
      const yDb = getNoteY(createNoteFromMidi(61, 0, undefined, true), centerMidi, layout);
      const yD = getNoteY(createNoteFromMidi(62), centerMidi, layout);
      expect(yDb).toBe(yD);
    });
  });

  describe('isSharp', () => {
    it('should return true for sharp notes', () => {
      const sharpNote: Note = {
        id: 'test',
        name: 'C#',
        octave: 4,
        frequency: 277.18,
        midi: 61,
        globalIndex: 0,
      };
      expect(isSharp(sharpNote)).toBe(true);
    });

    it('should return false for natural and flat notes', () => {
      const naturalNote: Note = {
        id: 'test',
        name: 'C',
        octave: 4,
        frequency: 261.63,
        midi: 60,
        globalIndex: 0,
      };
      const flatNote: Note = { ...naturalNote, name: 'Db', midi: 61 };

      expect(isSharp(naturalNote)).toBe(false);
      expect(isSharp(flatNote)).toBe(false);
    });

    it('should work with all sharp notes', () => {
      ['C#', 'D#', 'F#', 'G#', 'A#'].forEach((name) => {
        const note: Note = {
          id: 'test',
          name: name as Note['name'],
          octave: 4,
          frequency: 261.63,
          midi: 60,
          globalIndex: 0,
        };
        expect(isSharp(note)).toBe(true);
      });
    });
  });

  describe('isFlat', () => {
    it('should return true for flat notes', () => {
      const flatNote: Note = {
        id: 'test',
        name: 'Db',
        octave: 4,
        frequency: 277.18,
        midi: 61,
        globalIndex: 0,
      };
      expect(isFlat(flatNote)).toBe(true);
    });

    it('should return false for natural and sharp notes', () => {
      const naturalNote: Note = {
        id: 'test',
        name: 'C',
        octave: 4,
        frequency: 261.63,
        midi: 60,
        globalIndex: 0,
      };
      const sharpNote: Note = { ...naturalNote, name: 'C#', midi: 61 };

      expect(isFlat(naturalNote)).toBe(false);
      expect(isFlat(sharpNote)).toBe(false);
    });

    it('should work with all flat notes', () => {
      ['Db', 'Eb', 'Gb', 'Ab', 'Bb'].forEach((name) => {
        const note: Note = {
          id: 'test',
          name: name as Note['name'],
          octave: 4,
          frequency: 261.63,
          midi: 61,
          globalIndex: 0,
        };
        expect(isFlat(note)).toBe(true);
      });
    });
  });

  describe('getAccidental', () => {
    it('should return correct accidental type', () => {
      const sharpNote: Note = {
        id: 'test',
        name: 'C#',
        octave: 4,
        frequency: 277.18,
        midi: 61,
        globalIndex: 0,
      };
      const flatNote: Note = { ...sharpNote, name: 'Db' };
      const naturalNote: Note = { ...sharpNote, name: 'C', midi: 60 };

      expect(getAccidental(sharpNote)).toBe('sharp');
      expect(getAccidental(flatNote)).toBe('flat');
      expect(getAccidental(naturalNote)).toBe('none');
    });
  });
});
