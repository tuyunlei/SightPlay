import { Duration, Note } from '../../types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const createSongNote = (
  midi: number,
  globalIndex: number,
  duration: Duration = 'quarter'
): Note => {
  return {
    id: `song-note:${globalIndex}:${midi}`,
    name: NOTE_NAMES[midi % 12],
    octave: Math.floor(midi / 12) - 1,
    frequency: 440 * 2 ** ((midi - 69) / 12),
    midi,
    globalIndex,
    duration,
  };
};
