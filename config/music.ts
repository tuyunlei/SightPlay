import { NoteName } from '../types';

export const NOTE_NAMES: NoteName[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const TREBLE_RANGE = { min: 60, max: 79 }; // C4 to G5
export const BASS_RANGE = { min: 40, max: 60 }; // E2 to C4

export const STAFF_LINE_NOTES_TREBLE = [64, 67, 71, 74, 77]; // E4, G4, B4, D5, F5
export const STAFF_LINE_NOTES_BASS = [43, 47, 50, 53, 57]; // G2, B2, D3, F3, A3

export const SOLFEGE_MAP = ["Do", "Do♯", "Re", "Re♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"];
export const NUMBER_MAP = ["1", "1♯", "2", "2♯", "3", "4", "4♯", "5", "5♯", "6", "6♯", "7"];

export const getNoteLabels = (noteName: NoteName) => {
  const idx = NOTE_NAMES.indexOf(noteName);
  if (idx === -1) return { solfege: '', number: '' };
  return {
    solfege: SOLFEGE_MAP[idx],
    number: NUMBER_MAP[idx]
  };
};
