import { describe, expect, it } from 'vitest';

import { Note } from '../../types';

import { createStaffLayout, StaffLayout } from './staffLayout';
import { buildLedgers, getNoteColor, NoteColorParams } from './staffUtils';

describe('staffUtils rendering', () => {
  describe('buildLedgers', () => {
    let layout: StaffLayout;

    beforeEach(() => {
      layout = createStaffLayout(1000);
    });

    it('should return empty array for notes within staff bounds', () => {
      expect(buildLedgers(layout.STAFF_CENTER_Y, layout)).toEqual([]);
      expect(buildLedgers(layout.STAFF_TOP_Y, layout)).toEqual([]);
      expect(buildLedgers(layout.STAFF_BOTTOM_Y, layout)).toEqual([]);
      expect(buildLedgers(layout.STAFF_CENTER_Y + layout.STAFF_HALF_SPACE, layout)).toEqual([]);
    });

    it('should build ledger lines above the staff', () => {
      const y1 = layout.STAFF_TOP_Y - layout.STAFF_SPACE;
      const ledgers1 = buildLedgers(y1, layout);
      expect(ledgers1).toHaveLength(1);
      expect(ledgers1[0]).toBe(layout.STAFF_TOP_Y - layout.STAFF_SPACE);

      const y2 = layout.STAFF_TOP_Y - layout.STAFF_SPACE * 2;
      const ledgers2 = buildLedgers(y2, layout);
      expect(ledgers2).toHaveLength(2);
      expect(ledgers2).toContain(layout.STAFF_TOP_Y - layout.STAFF_SPACE);
      expect(ledgers2).toContain(layout.STAFF_TOP_Y - layout.STAFF_SPACE * 2);
    });

    it('should build ledger lines below the staff', () => {
      const y1 = layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE;
      const ledgers1 = buildLedgers(y1, layout);
      expect(ledgers1).toHaveLength(1);
      expect(ledgers1[0]).toBe(layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE);

      const y2 = layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE * 2;
      const ledgers2 = buildLedgers(y2, layout);
      expect(ledgers2).toHaveLength(2);
      expect(ledgers2).toContain(layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE);
      expect(ledgers2).toContain(layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE * 2);
    });

    it('should not build ledgers for notes just barely inside staff', () => {
      const yJustInside = layout.STAFF_TOP_Y - layout.STAFF_HALF_SPACE + 0.1;
      expect(buildLedgers(yJustInside, layout)).toEqual([]);
    });

    it('should build ledgers for notes at first ledger line position', () => {
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
      const yInGapTop = layout.STAFF_TOP_Y - layout.STAFF_HALF_SPACE - 1;
      expect(buildLedgers(yInGapTop, layout)).toEqual([]);

      const yInGapBottom = layout.STAFF_BOTTOM_Y + layout.STAFF_HALF_SPACE + 1;
      expect(buildLedgers(yInGapBottom, layout)).toEqual([]);
    });

    it('should handle extreme Y positions', () => {
      const yVeryHigh = layout.STAFF_TOP_Y - layout.STAFF_SPACE * 5;
      const ledgersHigh = buildLedgers(yVeryHigh, layout);
      expect(ledgersHigh.length).toBeGreaterThanOrEqual(5);

      const yVeryLow = layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE * 5;
      const ledgersLow = buildLedgers(yVeryLow, layout);
      expect(ledgersLow.length).toBeGreaterThanOrEqual(5);
    });

    it('should space ledgers correctly', () => {
      const y = layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE * 3;
      const ledgers = buildLedgers(y, layout);

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
      const params: NoteColorParams = {
        isExiting: false,
        index: 0,
        detectedNote: createMockNote(60),
        activeNote: createMockNote(62),
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
        index: 1,
        detectedNote: note,
        activeNote: note,
      };
      expect(getNoteColor(params)).toBe('#22c55e');
    });

    it('should handle all combinations of index and note states', () => {
      const note = createMockNote(60);

      expect(
        getNoteColor({ isExiting: false, index: 0, detectedNote: null, activeNote: undefined })
      ).toBe('#1e293b');
      expect(
        getNoteColor({ isExiting: false, index: 1, detectedNote: null, activeNote: undefined })
      ).toBe('#0f172a');
      expect(
        getNoteColor({ isExiting: false, index: 0, detectedNote: note, activeNote: note })
      ).toBe('#22c55e');
      expect(
        getNoteColor({ isExiting: false, index: 1, detectedNote: note, activeNote: note })
      ).toBe('#0f172a');
    });
  });
});
