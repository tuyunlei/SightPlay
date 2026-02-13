export type StaffLayout = {
  VIEWPORT_WIDTH: number;
  STAFF_SPACE: number;
  STAFF_HALF_SPACE: number;
  STAFF_LINE_THICKNESS: number;
  SVG_HEIGHT: number;
  STAFF_CENTER_Y: number;
  STAFF_TOP_Y: number;
  STAFF_BOTTOM_Y: number;
  START_X: number;
  NOTE_SPACING: number;
  RIGHT_PADDING: number;
  NOTE_HEAD_RX: number;
  NOTE_HEAD_RY: number;
  STEM_OFFSET: number;
  STEM_LENGTH: number;
  LEDGER_HALF_LENGTH: number;
  CLEF_X: number;
  TREBLE_CLEF_SIZE: number;
  BASS_CLEF_SIZE: number;
  TREBLE_CLEF_Y: number;
  BASS_CLEF_Y: number;
  TIME_SIG_X: number;
  TIME_SIG_SIZE: number;
  ACCIDENTAL_SIZE: number;
  HIGHLIGHT_X: number;
  HIGHLIGHT_WIDTH: number;
};

export const FALLBACK_VIEWPORT_WIDTH = 1000;

export const createStaffLayout = (viewportWidth: number): StaffLayout => {
  const STAFF_SPACE = 20;
  const STAFF_HALF_SPACE = STAFF_SPACE / 2;
  const STAFF_LINE_THICKNESS = STAFF_SPACE * 0.08;
  const SVG_HEIGHT = STAFF_SPACE * 11;
  const STAFF_CENTER_Y = SVG_HEIGHT / 2;
  const STAFF_TOP_Y = STAFF_CENTER_Y - STAFF_SPACE * 2;
  const STAFF_BOTTOM_Y = STAFF_CENTER_Y + STAFF_SPACE * 2;
  const START_X = STAFF_SPACE * 5.5;
  const NOTE_SPACING = STAFF_SPACE * 2.2;
  const RIGHT_PADDING = STAFF_SPACE * 2;
  const NOTE_HEAD_RX = STAFF_SPACE * 0.6;
  const NOTE_HEAD_RY = STAFF_SPACE * 0.42;
  const STEM_OFFSET = NOTE_HEAD_RX * 0.9;
  const STEM_LENGTH = STAFF_SPACE * 3.5;
  const LEDGER_HALF_LENGTH = NOTE_HEAD_RX + STAFF_SPACE / 2;
  const CLEF_X = STAFF_SPACE;
  const TREBLE_CLEF_SIZE = STAFF_SPACE * 4.2;
  const BASS_CLEF_SIZE = STAFF_SPACE * 3.2;
  const TREBLE_CLEF_Y = STAFF_CENTER_Y + STAFF_SPACE * 1.75;
  const BASS_CLEF_Y = STAFF_CENTER_Y + STAFF_SPACE * 0.75;
  const TIME_SIG_X = START_X - STAFF_SPACE * 2.75;
  const TIME_SIG_SIZE = STAFF_SPACE * 2;
  const ACCIDENTAL_SIZE = STAFF_SPACE * 1.1;
  const HIGHLIGHT_X = START_X - NOTE_SPACING / 2.5;
  const HIGHLIGHT_WIDTH = NOTE_SPACING * 0.9;

  return {
    VIEWPORT_WIDTH: viewportWidth,
    STAFF_SPACE,
    STAFF_HALF_SPACE,
    STAFF_LINE_THICKNESS,
    SVG_HEIGHT,
    STAFF_CENTER_Y,
    STAFF_TOP_Y,
    STAFF_BOTTOM_Y,
    START_X,
    NOTE_SPACING,
    RIGHT_PADDING,
    NOTE_HEAD_RX,
    NOTE_HEAD_RY,
    STEM_OFFSET,
    STEM_LENGTH,
    LEDGER_HALF_LENGTH,
    CLEF_X,
    TREBLE_CLEF_SIZE,
    BASS_CLEF_SIZE,
    TREBLE_CLEF_Y,
    BASS_CLEF_Y,
    TIME_SIG_X,
    TIME_SIG_SIZE,
    ACCIDENTAL_SIZE,
    HIGHLIGHT_X,
    HIGHLIGHT_WIDTH,
  };
};

export type GrandStaffLayout = {
  treble: StaffLayout;
  bass: StaffLayout;
  TOTAL_HEIGHT: number;
  STAFF_GAP: number;
  BRACE_X: number;
  BRACE_TOP_Y: number;
  BRACE_BOTTOM_Y: number;
};

export const createGrandStaffLayout = (viewportWidth: number): GrandStaffLayout => {
  const treble = createStaffLayout(viewportWidth);
  const STAFF_GAP = treble.STAFF_SPACE * 2.5;
  const yOffset = treble.SVG_HEIGHT + STAFF_GAP;

  const bass: StaffLayout = {
    ...treble,
    SVG_HEIGHT: treble.SVG_HEIGHT,
    STAFF_CENTER_Y: treble.STAFF_CENTER_Y + yOffset,
    STAFF_TOP_Y: treble.STAFF_TOP_Y + yOffset,
    STAFF_BOTTOM_Y: treble.STAFF_BOTTOM_Y + yOffset,
    TREBLE_CLEF_Y: treble.TREBLE_CLEF_Y + yOffset,
    BASS_CLEF_Y: treble.BASS_CLEF_Y + yOffset,
  };

  const TOTAL_HEIGHT = treble.SVG_HEIGHT + STAFF_GAP + bass.SVG_HEIGHT;
  const BRACE_X = treble.STAFF_SPACE * 0.3;
  const BRACE_TOP_Y = treble.STAFF_TOP_Y;
  const BRACE_BOTTOM_Y = bass.STAFF_BOTTOM_Y;

  return {
    treble,
    bass,
    TOTAL_HEIGHT,
    STAFF_GAP,
    BRACE_X,
    BRACE_TOP_Y,
    BRACE_BOTTOM_Y,
  };
};
