import { describe, expect, it } from 'vitest';

import { Note } from '../../types';

import { createStaffLayout, StaffLayout } from './staffLayout';
import { getNoteY, getStaffSteps, isSharp } from './staffUtils';

describe('staffUtils', () => {
  describe('getStaffSteps', () => {
    it('should return 0 when midi equals centerMidi', () => {
      expect(getStaffSteps(60, 60)).toBe(0); // C4 to C4
      expect(getStaffSteps(71, 71)).toBe(0); // B4 to B4
    });

    it('should calculate correct steps for diatonic scale (C major)', () => {
      const centerMidi = 60; // C4
      expect(getStaffSteps(60, centerMidi)).toBe(0); // C4
      expect(getStaffSteps(62, centerMidi)).toBe(1); // D4
      expect(getStaffSteps(64, centerMidi)).toBe(2); // E4
      expect(getStaffSteps(65, centerMidi)).toBe(3); // F4
      expect(getStaffSteps(67, centerMidi)).toBe(4); // G4
      expect(getStaffSteps(69, centerMidi)).toBe(5); // A4
      expect(getStaffSteps(71, centerMidi)).toBe(6); // B4
      expect(getStaffSteps(72, centerMidi)).toBe(7); // C5
    });

    it('should calculate negative steps for notes below center', () => {
      const centerMidi = 60; // C4
      expect(getStaffSteps(59, centerMidi)).toBe(-1); // B3
      expect(getStaffSteps(57, centerMidi)).toBe(-2); // A3
      expect(getStaffSteps(55, centerMidi)).toBe(-3); // G3
      expect(getStaffSteps(53, centerMidi)).toBe(-4); // F3
      expect(getStaffSteps(52, centerMidi)).toBe(-5); // E3
      expect(getStaffSteps(50, centerMidi)).toBe(-6); // D3
      expect(getStaffSteps(48, centerMidi)).toBe(-7); // C3
    });

    it('should handle chromatic notes (sharps/flats) by rounding to nearest diatonic', () => {
      const centerMidi = 60; // C4
      expect(getStaffSteps(61, centerMidi)).toBe(0); // C# rounds to C position
      expect(getStaffSteps(63, centerMidi)).toBe(1); // D# rounds to D position
      expect(getStaffSteps(66, centerMidi)).toBe(3); // F# rounds to F position
    });

    it('should handle extreme ranges', () => {
      const centerMidi = 60; // C4
      expect(getStaffSteps(108, centerMidi)).toBe(28); // 4 octaves up
      expect(getStaffSteps(24, centerMidi)).toBe(-21); // 3 octaves down
    });

    it('should work with different center notes', () => {
      expect(getStaffSteps(71, 71)).toBe(0);
      expect(getStaffSteps(72, 71)).toBe(1); // C5 is 1 step above B4
      expect(getStaffSteps(69, 71)).toBe(-1); // A4 is 1 step below B4

      expect(getStaffSteps(50, 50)).toBe(0);
      expect(getStaffSteps(52, 50)).toBe(1); // E3 is 1 step above D3
      expect(getStaffSteps(48, 50)).toBe(-1); // C3 is 1 step below D3
    });
  });

  describe('getNoteY', () => {
    let layout: StaffLayout;

    beforeEach(() => {
      layout = createStaffLayout(1000);
    });

    it('should place center note at STAFF_CENTER_Y', () => {
      const centerMidi = 71;
      const y = getNoteY(centerMidi, centerMidi, layout);
      expect(y).toBe(layout.STAFF_CENTER_Y);
    });

    it('should place notes above center at lower Y values', () => {
      const centerMidi = 71;
      const y1 = getNoteY(72, centerMidi, layout);
      const y2 = getNoteY(74, centerMidi, layout);

      expect(y1).toBeLessThan(layout.STAFF_CENTER_Y);
      expect(y2).toBeLessThan(y1);
      expect(y1).toBe(layout.STAFF_CENTER_Y - layout.STAFF_HALF_SPACE);
      expect(y2).toBe(layout.STAFF_CENTER_Y - 2 * layout.STAFF_HALF_SPACE);
    });

    it('should place notes below center at higher Y values', () => {
      const centerMidi = 71;
      const y1 = getNoteY(69, centerMidi, layout);
      const y2 = getNoteY(67, centerMidi, layout);

      expect(y1).toBeGreaterThan(layout.STAFF_CENTER_Y);
      expect(y2).toBeGreaterThan(y1);
      expect(y1).toBe(layout.STAFF_CENTER_Y + layout.STAFF_HALF_SPACE);
      expect(y2).toBe(layout.STAFF_CENTER_Y + 2 * layout.STAFF_HALF_SPACE);
    });

    it('should calculate Y correctly for notes on staff lines and spaces', () => {
      const centerMidi = 71;
      const lineNote = getNoteY(71, centerMidi, layout);
      const spaceNote = getNoteY(72, centerMidi, layout);

      expect(lineNote).toBe(layout.STAFF_CENTER_Y);
      expect(spaceNote).toBe(layout.STAFF_CENTER_Y - layout.STAFF_HALF_SPACE);
    });
  });

  describe('isSharp', () => {
    it('should return true for notes with # in name', () => {
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

    it('should return false for natural notes', () => {
      const naturalNotes: Note[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((name, i) => ({
        id: `test-${i}`,
        name: name as Note['name'],
        octave: 4,
        frequency: 261.63,
        midi: 60 + i,
        globalIndex: i,
      }));

      naturalNotes.forEach((note) => {
        expect(isSharp(note)).toBe(false);
      });
    });

    it('should work with all sharp notes', () => {
      const sharpNames: Note['name'][] = ['C#', 'D#', 'F#', 'G#', 'A#'];

      sharpNames.forEach((name, i) => {
        const note: Note = {
          id: `sharp-${i}`,
          name,
          octave: 4,
          frequency: 261.63,
          midi: 60,
          globalIndex: i,
        };
        expect(isSharp(note)).toBe(true);
      });
    });
  });
});
