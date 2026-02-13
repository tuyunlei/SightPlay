import { ClefType, Duration, NoteName, TimeSignature } from '../types';

export const NOTE_NAMES: NoteName[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

export const FLAT_NOTE_NAMES: NoteName[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

export const TREBLE_RANGE = { min: 60, max: 79 }; // C4 to G5
export const BASS_RANGE = { min: 40, max: 60 }; // E2 to C4

export const DURATION_BEATS: Record<Duration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

export const TIME_SIGNATURES: Record<'4/4' | '3/4' | '2/4' | '6/8', TimeSignature> = {
  '4/4': { beats: 4, beatUnit: 4 },
  '3/4': { beats: 3, beatUnit: 4 },
  '2/4': { beats: 2, beatUnit: 4 },
  '6/8': { beats: 6, beatUnit: 8 },
};

export const CLEF_CENTER_MIDI: Record<ClefType, number> = {
  [ClefType.TREBLE]: 71, // B4
  [ClefType.BASS]: 50, // D3
};

export const SOLFEGE_MAP = [
  'Do',
  'Do♯',
  'Re',
  'Re♯',
  'Mi',
  'Fa',
  'Fa♯',
  'Sol',
  'Sol♯',
  'La',
  'La♯',
  'Si',
];
export const NUMBER_MAP = ['1', '1♯', '2', '2♯', '3', '4', '4♯', '5', '5♯', '6', '6♯', '7'];

export const SOLFEGE_MAP_FLAT = [
  'Do',
  'Re♭',
  'Re',
  'Mi♭',
  'Mi',
  'Fa',
  'Sol♭',
  'Sol',
  'La♭',
  'La',
  'Si♭',
  'Si',
];
export const NUMBER_MAP_FLAT = ['1', '2♭', '2', '3♭', '3', '4', '5♭', '5', '6♭', '6', '7♭', '7'];

export const getNoteLabels = (noteName: NoteName) => {
  // Try sharp names first
  const sharpIdx = NOTE_NAMES.indexOf(noteName);
  if (sharpIdx !== -1) {
    return {
      solfege: SOLFEGE_MAP[sharpIdx],
      number: NUMBER_MAP[sharpIdx],
    };
  }
  // Try flat names
  const flatIdx = FLAT_NOTE_NAMES.indexOf(noteName);
  if (flatIdx !== -1) {
    return {
      solfege: SOLFEGE_MAP_FLAT[flatIdx],
      number: NUMBER_MAP_FLAT[flatIdx],
    };
  }
  return { solfege: '', number: '' };
};
