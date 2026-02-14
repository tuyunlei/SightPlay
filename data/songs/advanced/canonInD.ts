import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongNote } from '../utils';

export const canonInD: Song = {
  id: 'canon-in-d',
  title: 'Canon in D',
  difficulty: 'advanced',
  category: 'classical',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  notes: [
    // First measure
    createSongNote(66, 0, 'half'), // F#4
    createSongNote(64, 1, 'half'), // E4
    // Second measure
    createSongNote(62, 2, 'half'), // D4
    createSongNote(61, 3, 'half'), // C#4
    // Third measure
    createSongNote(59, 4, 'half'), // B3
    createSongNote(57, 5, 'half'), // A3
    // Fourth measure
    createSongNote(59, 6, 'half'), // B3
    createSongNote(61, 7, 'half'), // C#4
    // Fifth measure (melody starts)
    createSongNote(66, 8, 'quarter'), // F#4
    createSongNote(64, 9, 'quarter'), // E4
    createSongNote(66, 10, 'quarter'), // F#4
    createSongNote(61, 11, 'quarter'), // C#4
    // Sixth measure
    createSongNote(62, 12, 'quarter'), // D4
    createSongNote(61, 13, 'quarter'), // C#4
    createSongNote(62, 14, 'quarter'), // D4
    createSongNote(57, 15, 'quarter'), // A3
    // Seventh measure
    createSongNote(59, 16, 'quarter'), // B3
    createSongNote(57, 17, 'quarter'), // A3
    createSongNote(59, 18, 'quarter'), // B3
    createSongNote(66, 19, 'quarter'), // F#4
    // Eighth measure
    createSongNote(64, 20, 'quarter'), // E4
    createSongNote(66, 21, 'quarter'), // F#4
    createSongNote(64, 22, 'eighth'), // E4
    createSongNote(62, 23, 'eighth'), // D4
    createSongNote(64, 24, 'quarter'), // E4
    createSongNote(61, 25, 'quarter'), // C#4
  ],
};
