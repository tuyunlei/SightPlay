import { describe, expect, it } from 'vitest';

import { createGrandStaffLayout, createStaffLayout } from './staffLayout';

describe('staffLayout - createGrandStaffLayout', () => {
  it('should create layouts for both treble and bass staves', () => {
    const grandLayout = createGrandStaffLayout(1000);

    expect(grandLayout.treble).toBeDefined();
    expect(grandLayout.bass).toBeDefined();
    expect(grandLayout.treble.VIEWPORT_WIDTH).toBe(1000);
    expect(grandLayout.bass.VIEWPORT_WIDTH).toBe(1000);
  });

  it('should have treble staff above bass staff with no overlap', () => {
    const grandLayout = createGrandStaffLayout(1000);

    // Treble staff should be positioned at the top
    expect(grandLayout.treble.STAFF_CENTER_Y).toBeLessThan(grandLayout.bass.STAFF_CENTER_Y);
    expect(grandLayout.treble.STAFF_BOTTOM_Y).toBeLessThan(grandLayout.bass.STAFF_TOP_Y);
  });

  it('should have shared X positioning between staves', () => {
    const grandLayout = createGrandStaffLayout(1000);

    // Both staves should share the same horizontal positioning
    expect(grandLayout.treble.START_X).toBe(grandLayout.bass.START_X);
    expect(grandLayout.treble.NOTE_SPACING).toBe(grandLayout.bass.NOTE_SPACING);
    expect(grandLayout.treble.CLEF_X).toBe(grandLayout.bass.CLEF_X);
    expect(grandLayout.treble.TIME_SIG_X).toBe(grandLayout.bass.TIME_SIG_X);
    expect(grandLayout.treble.RIGHT_PADDING).toBe(grandLayout.bass.RIGHT_PADDING);
  });

  it('should calculate correct total height', () => {
    const grandLayout = createGrandStaffLayout(1000);

    const expectedHeight =
      grandLayout.treble.SVG_HEIGHT + grandLayout.STAFF_GAP + grandLayout.bass.SVG_HEIGHT;

    expect(grandLayout.TOTAL_HEIGHT).toBe(expectedHeight);
  });

  it('should have appropriate staff gap', () => {
    const grandLayout = createGrandStaffLayout(1000);

    // Gap should be approximately 2-3 times STAFF_SPACE
    expect(grandLayout.STAFF_GAP).toBeGreaterThanOrEqual(grandLayout.treble.STAFF_SPACE * 2);
    expect(grandLayout.STAFF_GAP).toBeLessThanOrEqual(grandLayout.treble.STAFF_SPACE * 3);
  });

  it('should have brace positioned on the left', () => {
    const grandLayout = createGrandStaffLayout(1000);

    // Brace should be to the left of clef symbols
    expect(grandLayout.BRACE_X).toBeLessThan(grandLayout.treble.CLEF_X);
    expect(grandLayout.BRACE_X).toBeGreaterThan(0);
  });

  it('should have brace spanning both staves', () => {
    const grandLayout = createGrandStaffLayout(1000);

    // Brace should start at the top of the treble staff lines
    expect(grandLayout.BRACE_TOP_Y).toBe(grandLayout.treble.STAFF_TOP_Y);

    // Brace should end at the bottom of the bass staff lines
    expect(grandLayout.BRACE_BOTTOM_Y).toBe(grandLayout.bass.STAFF_BOTTOM_Y);

    // Brace height should span both staves
    const braceHeight = grandLayout.BRACE_BOTTOM_Y - grandLayout.BRACE_TOP_Y;
    expect(braceHeight).toBeGreaterThan(grandLayout.treble.SVG_HEIGHT);
  });

  it('should maintain consistent staff space across both staves', () => {
    const grandLayout = createGrandStaffLayout(1000);

    expect(grandLayout.treble.STAFF_SPACE).toBe(grandLayout.bass.STAFF_SPACE);
  });

  it('should position bass staff with correct Y offset', () => {
    const grandLayout = createGrandStaffLayout(1000);

    const expectedOffset = grandLayout.treble.SVG_HEIGHT + grandLayout.STAFF_GAP;

    expect(grandLayout.bass.STAFF_CENTER_Y).toBe(
      grandLayout.treble.STAFF_CENTER_Y + expectedOffset
    );
    expect(grandLayout.bass.STAFF_TOP_Y).toBe(grandLayout.treble.STAFF_TOP_Y + expectedOffset);
    expect(grandLayout.bass.STAFF_BOTTOM_Y).toBe(
      grandLayout.treble.STAFF_BOTTOM_Y + expectedOffset
    );
  });

  it('should create valid layout for different viewport widths', () => {
    [600, 1000, 1200, 2000].forEach((width) => {
      const grandLayout = createGrandStaffLayout(width);

      expect(grandLayout.treble.VIEWPORT_WIDTH).toBe(width);
      expect(grandLayout.bass.VIEWPORT_WIDTH).toBe(width);
      expect(grandLayout.TOTAL_HEIGHT).toBeGreaterThan(0);
      expect(grandLayout.treble.STAFF_CENTER_Y).toBeLessThan(grandLayout.bass.STAFF_CENTER_Y);
    });
  });

  it('should have TOTAL_HEIGHT greater than single staff', () => {
    const singleLayout = createStaffLayout(1000);
    const grandLayout = createGrandStaffLayout(1000);

    expect(grandLayout.TOTAL_HEIGHT).toBeGreaterThan(singleLayout.SVG_HEIGHT);
    expect(grandLayout.TOTAL_HEIGHT).toBeGreaterThan(singleLayout.SVG_HEIGHT * 2);
  });

  it('should preserve all layout properties from single staff', () => {
    const grandLayout = createGrandStaffLayout(1000);

    // Verify treble staff has all expected properties
    expect(grandLayout.treble.STAFF_SPACE).toBeGreaterThan(0);
    expect(grandLayout.treble.NOTE_SPACING).toBeGreaterThan(0);
    expect(grandLayout.treble.CLEF_X).toBeGreaterThan(0);

    // Verify bass staff has all expected properties
    expect(grandLayout.bass.STAFF_SPACE).toBeGreaterThan(0);
    expect(grandLayout.bass.NOTE_SPACING).toBeGreaterThan(0);
    expect(grandLayout.bass.CLEF_X).toBeGreaterThan(0);
  });

  it('should have brace positioned before clef symbols', () => {
    const grandLayout = createGrandStaffLayout(1000);

    expect(grandLayout.BRACE_X).toBeLessThan(grandLayout.treble.CLEF_X);
    expect(grandLayout.BRACE_X).toBeLessThan(grandLayout.bass.CLEF_X);
  });

  it('should have gap that allows visual separation', () => {
    const grandLayout = createGrandStaffLayout(1000);

    // Gap should be large enough to visually separate the staves
    const trebleBottom = grandLayout.treble.STAFF_BOTTOM_Y;
    const bassTop = grandLayout.bass.STAFF_TOP_Y;
    const actualGap = bassTop - trebleBottom;

    expect(actualGap).toBeGreaterThan(grandLayout.treble.STAFF_SPACE);
  });

  it('should calculate brace height correctly', () => {
    const grandLayout = createGrandStaffLayout(1000);

    const braceHeight = grandLayout.BRACE_BOTTOM_Y - grandLayout.BRACE_TOP_Y;
    const expectedMinHeight =
      (grandLayout.treble.STAFF_BOTTOM_Y - grandLayout.treble.STAFF_TOP_Y) * 2;

    expect(braceHeight).toBeGreaterThan(expectedMinHeight);
  });
});
