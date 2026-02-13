import { NOTE_NAMES } from '../config/music';
import { Duration, Note } from '../types';

const A4_FREQ = 440;
const A4_MIDI = 69;

export const createNoteFromMidi = (
  midi: number,
  globalIndex: number = 0,
  duration?: Duration
): Note => {
  const frequency = A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
  const noteNameIndex = midi % 12;
  const name = NOTE_NAMES[noteNameIndex];
  const octave = Math.floor(midi / 12) - 1;

  return {
    id: crypto.randomUUID(),
    name,
    octave,
    frequency,
    midi,
    globalIndex,
    duration,
  };
};

// Parse scientific notation (e.g., C4) to MIDI
export const noteStringToMidi = (noteStr: string): number | null => {
  const match = noteStr.match(/^([A-G][#]?)(-?\d+)$/);
  if (!match) return null;
  const name = match[1];
  const octave = parseInt(match[2], 10);
  const idx = NOTE_NAMES.indexOf(name as (typeof NOTE_NAMES)[number]);
  if (idx === -1) return null;
  return (octave + 1) * 12 + idx;
};
