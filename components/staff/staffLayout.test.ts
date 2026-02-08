import { describe, expect, it } from 'vitest';

import { createStaffLayout, FALLBACK_VIEWPORT_WIDTH } from './staffLayout';

describe('staffLayout', () => {
  describe('createStaffLayout', () => {
    it('should create a layout with the provided viewport width', () => {
      const width = 1200;
      const layout = createStaffLayout(width);
      expect(layout.VIEWPORT_WIDTH).toBe(width);
    });

    it('should create consistent layout for different viewport widths', () => {
      const layouts = [800, 1000, 1200, 1600].map((w) => createStaffLayout(w));

      // All layouts should have the same STAFF_SPACE (viewport width doesn't affect this)
      const staffSpaces = layouts.map((l) => l.STAFF_SPACE);
      expect(new Set(staffSpaces).size).toBe(1);

      // All other derived values should also be consistent
      expect(layouts.every((l) => l.STAFF_SPACE === 20)).toBe(true);
    });

    it('should have correct mathematical relationships', () => {
      const layout = createStaffLayout(1000);

      // Half space is half of full space
      expect(layout.STAFF_HALF_SPACE).toBe(layout.STAFF_SPACE / 2);

      // Center Y should be in the middle of SVG
      expect(layout.STAFF_CENTER_Y).toBe(layout.SVG_HEIGHT / 2);

      // Staff lines should be symmetrically placed around center
      expect(layout.STAFF_TOP_Y).toBe(layout.STAFF_CENTER_Y - layout.STAFF_SPACE * 2);
      expect(layout.STAFF_BOTTOM_Y).toBe(layout.STAFF_CENTER_Y + layout.STAFF_SPACE * 2);

      // Verify Y positions are in correct order (top < center < bottom)
      expect(layout.STAFF_TOP_Y).toBeLessThan(layout.STAFF_CENTER_Y);
      expect(layout.STAFF_CENTER_Y).toBeLessThan(layout.STAFF_BOTTOM_Y);
    });

    it('should have positive dimensions', () => {
      const layout = createStaffLayout(1000);

      // All size/space values should be positive
      expect(layout.STAFF_SPACE).toBeGreaterThan(0);
      expect(layout.STAFF_HALF_SPACE).toBeGreaterThan(0);
      expect(layout.STAFF_LINE_THICKNESS).toBeGreaterThan(0);
      expect(layout.SVG_HEIGHT).toBeGreaterThan(0);
      expect(layout.START_X).toBeGreaterThan(0);
      expect(layout.NOTE_SPACING).toBeGreaterThan(0);
      expect(layout.RIGHT_PADDING).toBeGreaterThan(0);
      expect(layout.NOTE_HEAD_RX).toBeGreaterThan(0);
      expect(layout.NOTE_HEAD_RY).toBeGreaterThan(0);
      expect(layout.STEM_LENGTH).toBeGreaterThan(0);
      expect(layout.LEDGER_HALF_LENGTH).toBeGreaterThan(0);
    });

    it('should have reasonable staff proportions', () => {
      const layout = createStaffLayout(1000);

      // Staff should occupy a reasonable portion of SVG height
      const staffHeight = layout.STAFF_BOTTOM_Y - layout.STAFF_TOP_Y;
      expect(staffHeight).toBe(layout.STAFF_SPACE * 4); // 4 spaces between 5 lines

      // Note head should be smaller than staff space
      expect(layout.NOTE_HEAD_RX).toBeLessThan(layout.STAFF_SPACE);
      expect(layout.NOTE_HEAD_RY).toBeLessThan(layout.STAFF_SPACE);

      // Stem should be longer than staff space
      expect(layout.STEM_LENGTH).toBeGreaterThan(layout.STAFF_SPACE);
    });

    it('should have clef symbols positioned appropriately', () => {
      const layout = createStaffLayout(1000);

      // Clef X should be before START_X (where notes begin)
      expect(layout.CLEF_X).toBeLessThan(layout.START_X);

      // Time signature X should be between clef and note start
      expect(layout.TIME_SIG_X).toBeGreaterThan(layout.CLEF_X);
      expect(layout.TIME_SIG_X).toBeLessThan(layout.START_X);

      // Clef Y positions should be around staff center
      expect(layout.TREBLE_CLEF_Y).toBeGreaterThan(layout.STAFF_CENTER_Y);
      expect(layout.BASS_CLEF_Y).toBeGreaterThan(layout.STAFF_TOP_Y);
      expect(layout.BASS_CLEF_Y).toBeLessThan(layout.STAFF_BOTTOM_Y);
    });

    it('should have appropriate sizes for musical symbols', () => {
      const layout = createStaffLayout(1000);

      // Clef sizes should be proportional to staff space
      expect(layout.TREBLE_CLEF_SIZE).toBeGreaterThan(layout.STAFF_SPACE * 3);
      expect(layout.BASS_CLEF_SIZE).toBeGreaterThan(layout.STAFF_SPACE * 2);

      // Time signature and accidental sizes should be proportional
      expect(layout.TIME_SIG_SIZE).toBeCloseTo(layout.STAFF_SPACE * 2, 1);
      expect(layout.ACCIDENTAL_SIZE).toBeCloseTo(layout.STAFF_SPACE * 1.1, 1);
    });

    it('should have highlight region positioned correctly', () => {
      const layout = createStaffLayout(1000);

      // Highlight should be positioned before the first note
      expect(layout.HIGHLIGHT_X).toBeLessThan(layout.START_X);

      // Highlight width should be proportional to note spacing
      expect(layout.HIGHLIGHT_WIDTH).toBeLessThan(layout.NOTE_SPACING);
      expect(layout.HIGHLIGHT_WIDTH).toBeGreaterThan(0);
    });

    it('should have consistent spacing calculations', () => {
      const layout = createStaffLayout(1000);

      // Note spacing should be consistent
      expect(layout.NOTE_SPACING).toBeCloseTo(layout.STAFF_SPACE * 2.2, 1);

      // Ledger half length should account for note head
      expect(layout.LEDGER_HALF_LENGTH).toBeGreaterThan(layout.NOTE_HEAD_RX);
    });

    it('should create valid layout for fallback width', () => {
      const layout = createStaffLayout(FALLBACK_VIEWPORT_WIDTH);
      expect(layout.VIEWPORT_WIDTH).toBe(FALLBACK_VIEWPORT_WIDTH);
      expect(layout.STAFF_SPACE).toBeGreaterThan(0);
    });

    it('should create valid layout for small viewport', () => {
      const layout = createStaffLayout(600);
      expect(layout.VIEWPORT_WIDTH).toBe(600);

      // All values should still be valid
      expect(layout.STAFF_SPACE).toBeGreaterThan(0);
      expect(layout.SVG_HEIGHT).toBeGreaterThan(0);
      expect(layout.STAFF_TOP_Y).toBeLessThan(layout.STAFF_CENTER_Y);
      expect(layout.STAFF_CENTER_Y).toBeLessThan(layout.STAFF_BOTTOM_Y);
    });

    it('should create valid layout for large viewport', () => {
      const layout = createStaffLayout(2000);
      expect(layout.VIEWPORT_WIDTH).toBe(2000);

      // All values should still be valid
      expect(layout.STAFF_SPACE).toBeGreaterThan(0);
      expect(layout.SVG_HEIGHT).toBeGreaterThan(0);
      expect(layout.STAFF_TOP_Y).toBeLessThan(layout.STAFF_CENTER_Y);
      expect(layout.STAFF_CENTER_Y).toBeLessThan(layout.STAFF_BOTTOM_Y);
    });

    it('should have bar interval as integer', () => {
      const layout = createStaffLayout(1000);
      expect(layout.BAR_INTERVAL).toBe(4);
      expect(Number.isInteger(layout.BAR_INTERVAL)).toBe(true);
    });

    it('should have stem offset relative to note head', () => {
      const layout = createStaffLayout(1000);

      // Stem offset should be less than note head radius
      expect(layout.STEM_OFFSET).toBeLessThan(layout.NOTE_HEAD_RX);
      expect(layout.STEM_OFFSET).toBeCloseTo(layout.NOTE_HEAD_RX * 0.9, 2);
    });

    it('should maintain proportional relationships across all values', () => {
      const layout = createStaffLayout(1000);
      const staffSpace = layout.STAFF_SPACE;

      // Verify all values are proportional to STAFF_SPACE
      expect(layout.STAFF_HALF_SPACE).toBe(staffSpace / 2);
      expect(layout.STAFF_LINE_THICKNESS).toBe(staffSpace * 0.08);
      expect(layout.SVG_HEIGHT).toBe(staffSpace * 11);
      expect(layout.START_X).toBe(staffSpace * 5.5);
      expect(layout.NOTE_SPACING).toBe(staffSpace * 2.2);
      expect(layout.RIGHT_PADDING).toBe(staffSpace * 2);
      expect(layout.NOTE_HEAD_RX).toBe(staffSpace * 0.6);
      expect(layout.NOTE_HEAD_RY).toBe(staffSpace * 0.42);
      expect(layout.STEM_LENGTH).toBe(staffSpace * 3.5);
      expect(layout.CLEF_X).toBe(staffSpace);
      expect(layout.TREBLE_CLEF_SIZE).toBe(staffSpace * 4.2);
      expect(layout.BASS_CLEF_SIZE).toBe(staffSpace * 3.2);
      expect(layout.TREBLE_CLEF_Y).toBe(layout.STAFF_CENTER_Y + staffSpace * 1.75);
      expect(layout.BASS_CLEF_Y).toBe(layout.STAFF_CENTER_Y + staffSpace * 0.75);
      expect(layout.TIME_SIG_SIZE).toBe(staffSpace * 2);
      expect(layout.ACCIDENTAL_SIZE).toBe(staffSpace * 1.1);
    });
  });
});
