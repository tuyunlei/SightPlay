import { ClefType, Duration, NoteName } from '../types';

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

export const TREBLE_RANGE = { min: 60, max: 79 }; // C4 to G5
export const BASS_RANGE = { min: 40, max: 60 }; // E2 to C4

export const DURATION_BEATS: Record<Duration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
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

export const getNoteLabels = (noteName: NoteName) => {
  const idx = NOTE_NAMES.indexOf(noteName);
  if (idx === -1) return { solfege: '', number: '' };
  return {
    solfege: SOLFEGE_MAP[idx],
    number: NUMBER_MAP[idx],
  };
};
