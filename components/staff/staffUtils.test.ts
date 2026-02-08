import { describe, expect, it } from 'vitest';

import { Note } from '../../types';

import { createStaffLayout, StaffLayout } from './staffLayout';
import {
  buildLedgers,
  getNoteColor,
  getNoteY,
  getStaffSteps,
  isSharp,
  NoteColorParams,
} from './staffUtils';

describe('staffUtils', () => {
  describe('getStaffSteps', () => {
    it('should return 0 when midi equals centerMidi', () => {
      expect(getStaffSteps(60, 60)).toBe(0); // C4 to C4
      expect(getStaffSteps(71, 71)).toBe(0); // B4 to B4
    });

    it('should calculate correct steps for diatonic scale (C major)', () => {
      const centerMidi = 60; // C4
      // C major scale: C D E F G A B C
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
      // C# (61) should round to nearest diatonic position (C=0 or D=1)
      expect(getStaffSteps(61, centerMidi)).toBe(0); // C# rounds to C position
      // D# (63) should round to D position
      expect(getStaffSteps(63, centerMidi)).toBe(1); // D# rounds to D position
      // F# (66) should round to F position
      expect(getStaffSteps(66, centerMidi)).toBe(3); // F# rounds to F position
    });

    it('should handle extreme ranges', () => {
      const centerMidi = 60; // C4
      // Very high note: C8 (MIDI 108)
      expect(getStaffSteps(108, centerMidi)).toBe(28); // 4 octaves up
      // Very low note: C1 (MIDI 24)
      expect(getStaffSteps(24, centerMidi)).toBe(-21); // 3 octaves down
    });

    it('should work with different center notes', () => {
      // Treble clef center: B4 (MIDI 71)
      expect(getStaffSteps(71, 71)).toBe(0);
      expect(getStaffSteps(72, 71)).toBe(1); // C5 is 1 step above B4
      expect(getStaffSteps(69, 71)).toBe(-1); // A4 is 1 step below B4

      // Bass clef center: D3 (MIDI 50)
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
      const centerMidi = 71; // B4 for treble clef
      const y = getNoteY(centerMidi, centerMidi, layout);
      expect(y).toBe(layout.STAFF_CENTER_Y);
    });

    it('should place notes above center at lower Y values', () => {
      const centerMidi = 71; // B4
      const y1 = getNoteY(72, centerMidi, layout); // C5 (1 step above)
      const y2 = getNoteY(74, centerMidi, layout); // D5 (2 steps above)

      expect(y1).toBeLessThan(layout.STAFF_CENTER_Y);
      expect(y2).toBeLessThan(y1);
      expect(y1).toBe(layout.STAFF_CENTER_Y - layout.STAFF_HALF_SPACE);
      expect(y2).toBe(layout.STAFF_CENTER_Y - 2 * layout.STAFF_HALF_SPACE);
    });

    it('should place notes below center at higher Y values', () => {
      const centerMidi = 71; // B4
      const y1 = getNoteY(69, centerMidi, layout); // A4 (1 step below)
      const y2 = getNoteY(67, centerMidi, layout); // G4 (2 steps below)

      expect(y1).toBeGreaterThan(layout.STAFF_CENTER_Y);
      expect(y2).toBeGreaterThan(y1);
      expect(y1).toBe(layout.STAFF_CENTER_Y + layout.STAFF_HALF_SPACE);
      expect(y2).toBe(layout.STAFF_CENTER_Y + 2 * layout.STAFF_HALF_SPACE);
    });

    it('should calculate Y correctly for notes on staff lines and spaces', () => {
      const centerMidi = 71; // B4 (treble clef center, middle line)
      // Staff lines from bottom: E4(64), G4(67), B4(71), D5(74), F5(77)
      // Spaces: F4(65), A4(69), C5(72), E5(76)

      const lineNote = getNoteY(71, centerMidi, layout); // B4 on middle line
      const spaceNote = getNoteY(72, centerMidi, layout); // C5 in space above

      expect(lineNote).toBe(layout.STAFF_CENTER_Y);
      expect(spaceNote).toBe(layout.STAFF_CENTER_Y - layout.STAFF_HALF_SPACE);
    });
  });

  describe('buildLedgers', () => {
    let layout: StaffLayout;

    beforeEach(() => {
      layout = createStaffLayout(1000);
    });

    it('should return empty array for notes within staff bounds', () => {
      // Notes on or between the 5 staff lines don't need ledgers
      expect(buildLedgers(layout.STAFF_CENTER_Y, layout)).toEqual([]);
      expect(buildLedgers(layout.STAFF_TOP_Y, layout)).toEqual([]);
      expect(buildLedgers(layout.STAFF_BOTTOM_Y, layout)).toEqual([]);
      expect(buildLedgers(layout.STAFF_CENTER_Y + layout.STAFF_HALF_SPACE, layout)).toEqual([]);
    });

    it('should build ledger lines above the staff', () => {
      // Note above the top staff line
      const y1 = layout.STAFF_TOP_Y - layout.STAFF_SPACE; // 1 ledger above
      const ledgers1 = buildLedgers(y1, layout);
      expect(ledgers1).toHaveLength(1);
      expect(ledgers1[0]).toBe(layout.STAFF_TOP_Y - layout.STAFF_SPACE);

      const y2 = layout.STAFF_TOP_Y - layout.STAFF_SPACE * 2; // 2 ledgers above
      const ledgers2 = buildLedgers(y2, layout);
      expect(ledgers2).toHaveLength(2);
      expect(ledgers2).toContain(layout.STAFF_TOP_Y - layout.STAFF_SPACE);
      expect(ledgers2).toContain(layout.STAFF_TOP_Y - layout.STAFF_SPACE * 2);
    });

    it('should build ledger lines below the staff', () => {
      // Note below the bottom staff line
      const y1 = layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE; // 1 ledger below
      const ledgers1 = buildLedgers(y1, layout);
      expect(ledgers1).toHaveLength(1);
      expect(ledgers1[0]).toBe(layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE);

      const y2 = layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE * 2; // 2 ledgers below
      const ledgers2 = buildLedgers(y2, layout);
      expect(ledgers2).toHaveLength(2);
      expect(ledgers2).toContain(layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE);
      expect(ledgers2).toContain(layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE * 2);
    });

    it('should not build ledgers for notes just barely inside staff', () => {
      // Note exactly at the boundary shouldn't need ledger
      const yJustInside = layout.STAFF_TOP_Y - layout.STAFF_HALF_SPACE + 0.1;
      expect(buildLedgers(yJustInside, layout)).toEqual([]);
    });

    it('should build ledgers for notes at first ledger line position', () => {
      // Note at or beyond the first ledger line position should have ledgers
      const yAtFirstLedgerTop = layout.STAFF_TOP_Y - layout.STAFF_SPACE;
      const ledgersTop = buildLedgers(yAtFirstLedgerTop, layout);
      expect(ledgersTop.length).toBe(1);
      expect(ledgersTop[0]).toBe(layout.STAFF_TOP_Y - layout.STAFF_SPACE);

      const yAtFirstLedgerBottom = layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE;
      const ledgersBottom = buildLedgers(yAtFirstLedgerBottom, layout);
      expect(ledgersBottom.length).toBe(1);
      expect(ledgersBottom[0]).toBe(layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE);
    });

    it('should not build ledgers for notes in the gap before first ledger', () => {
      // Notes just outside staff but before first ledger position don't get ledgers yet
      const yInGapTop = layout.STAFF_TOP_Y - layout.STAFF_HALF_SPACE - 1;
      const ledgersTop = buildLedgers(yInGapTop, layout);
      expect(ledgersTop).toEqual([]);

      const yInGapBottom = layout.STAFF_BOTTOM_Y + layout.STAFF_HALF_SPACE + 1;
      const ledgersBottom = buildLedgers(yInGapBottom, layout);
      expect(ledgersBottom).toEqual([]);
    });

    it('should handle extreme Y positions', () => {
      // Very high note (many ledgers above)
      const yVeryHigh = layout.STAFF_TOP_Y - layout.STAFF_SPACE * 5;
      const ledgersHigh = buildLedgers(yVeryHigh, layout);
      expect(ledgersHigh.length).toBeGreaterThanOrEqual(5);

      // Very low note (many ledgers below)
      const yVeryLow = layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE * 5;
      const ledgersLow = buildLedgers(yVeryLow, layout);
      expect(ledgersLow.length).toBeGreaterThanOrEqual(5);
    });

    it('should space ledgers correctly', () => {
      const y = layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE * 3;
      const ledgers = buildLedgers(y, layout);

      // Check that ledgers are evenly spaced by STAFF_SPACE
      for (let i = 1; i < ledgers.length; i++) {
        expect(ledgers[i] - ledgers[i - 1]).toBe(layout.STAFF_SPACE);
      }
    });
  });

  describe('getNoteColor', () => {
    const createMockNote = (midi: number): Note => ({
      id: `note-${midi}`,
      name: 'C',
      octave: 4,
      frequency: 261.63,
      midi,
      globalIndex: 0,
    });

    it('should return green when note is exiting', () => {
      const params: NoteColorParams = {
        isExiting: true,
        index: 0,
        detectedNote: null,
        activeNote: undefined,
      };
      expect(getNoteColor(params)).toBe('#22c55e');
    });

    it('should return green when first note matches detected note', () => {
      const note = createMockNote(60);
      const params: NoteColorParams = {
        isExiting: false,
        index: 0,
        detectedNote: note,
        activeNote: note,
      };
      expect(getNoteColor(params)).toBe('#22c55e');
    });

    it('should return dark color when first note does not match detected note', () => {
      const detectedNote = createMockNote(60);
      const activeNote = createMockNote(62);
      const params: NoteColorParams = {
        isExiting: false,
        index: 0,
        detectedNote,
        activeNote,
      };
      expect(getNoteColor(params)).toBe('#1e293b');
    });

    it('should return dark color when first note has no detected note', () => {
      const params: NoteColorParams = {
        isExiting: false,
        index: 0,
        detectedNote: null,
        activeNote: createMockNote(60),
      };
      expect(getNoteColor(params)).toBe('#1e293b');
    });

    it('should return dark color when first note has no active note', () => {
      const params: NoteColorParams = {
        isExiting: false,
        index: 0,
        detectedNote: createMockNote(60),
        activeNote: undefined,
      };
      expect(getNoteColor(params)).toBe('#1e293b');
    });

    it('should return darkest color for non-first notes', () => {
      const params: NoteColorParams = {
        isExiting: false,
        index: 1,
        detectedNote: null,
        activeNote: undefined,
      };
      expect(getNoteColor(params)).toBe('#0f172a');
    });

    it('should prioritize exiting state over other conditions', () => {
      const note = createMockNote(60);
      const params: NoteColorParams = {
        isExiting: true,
        index: 1, // not first note
        detectedNote: note,
        activeNote: note,
      };
      // Exiting should always return green, regardless of other params
      expect(getNoteColor(params)).toBe('#22c55e');
    });

    it('should handle all combinations of index and note states', () => {
      const note = createMockNote(60);

      // Test matrix: index (0, 1+) × detectedNote (null, note) × activeNote (undefined, note)
      expect(
        getNoteColor({
          isExiting: false,
          index: 0,
          detectedNote: null,
          activeNote: undefined,
        })
      ).toBe('#1e293b');

      expect(
        getNoteColor({
          isExiting: false,
          index: 1,
          detectedNote: null,
          activeNote: undefined,
        })
      ).toBe('#0f172a');

      expect(
        getNoteColor({
          isExiting: false,
          index: 0,
          detectedNote: note,
          activeNote: note,
        })
      ).toBe('#22c55e');

      expect(
        getNoteColor({
          isExiting: false,
          index: 1,
          detectedNote: note,
          activeNote: note,
        })
      ).toBe('#0f172a');
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
