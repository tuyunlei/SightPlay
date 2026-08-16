const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

export interface MidiNote {
  readonly name: NoteName;
  readonly octave: number;
  readonly frequency: number;
  readonly midi: number;
}

export function createNoteFromMidi(midi: number): MidiNote {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
    throw new RangeError(`Invalid MIDI note: ${midi}`);
  }
  return {
    name: NOTE_NAMES[midi % 12],
    octave: Math.floor(midi / 12) - 1,
    frequency: 440 * 2 ** ((midi - 69) / 12),
    midi,
  };
}
