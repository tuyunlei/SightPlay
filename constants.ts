import { Note, NoteName } from './types';

export const NOTE_NAMES: NoteName[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Base A4 = 440Hz
const A4_FREQ = 440;
const A4_MIDI = 69;

export const createNoteFromMidi = (midi: number, globalIndex: number = 0): Note => {
  const frequency = A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
  const noteNameIndex = midi % 12;
  const name = NOTE_NAMES[noteNameIndex];
  const octave = Math.floor(midi / 12) - 1;

  return {
    id: crypto.randomUUID(), // Add unique ID
    name,
    octave,
    frequency,
    midi,
    globalIndex
  };
};

// Helper for static list generation if needed
export const NOTES: Note[] = [];
for (let i = 36; i <= 84; i++) {
  NOTES.push(createNoteFromMidi(i, 0));
}

export const TREBLE_RANGE = { min: 60, max: 79 }; // C4 to G5
export const BASS_RANGE = { min: 40, max: 60 };   // E2 to C4

export const STAFF_LINE_NOTES_TREBLE = [64, 67, 71, 74, 77]; // E4, G4, B4, D5, F5
export const STAFF_LINE_NOTES_BASS = [43, 47, 50, 53, 57];   // G2, B2, D3, F3, A3

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