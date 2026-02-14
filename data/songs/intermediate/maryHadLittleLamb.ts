import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongNote } from '../utils';

export const maryHadLittleLamb: Song = {
  id: 'mary-had-little-lamb',
  title: 'Mary Had a Little Lamb',
  difficulty: 'intermediate',
  category: 'folk',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  notes: [
    // Ma-ry had a lit-tle lamb
    createSongNote(64, 0, 'quarter'), // E4
    createSongNote(62, 1, 'quarter'), // D4
    createSongNote(60, 2, 'quarter'), // C4
    createSongNote(62, 3, 'quarter'), // D4
    createSongNote(64, 4, 'quarter'), // E4
    createSongNote(64, 5, 'quarter'), // E4
    createSongNote(64, 6, 'half'), // E4
    // Lit-tle lamb, lit-tle lamb
    createSongNote(62, 7, 'quarter'), // D4
    createSongNote(62, 8, 'quarter'), // D4
    createSongNote(62, 9, 'half'), // D4
    createSongNote(64, 10, 'quarter'), // E4
    createSongNote(67, 11, 'quarter'), // G4
    createSongNote(67, 12, 'half'), // G4
    // Ma-ry had a lit-tle lamb
    createSongNote(64, 13, 'quarter'), // E4
    createSongNote(62, 14, 'quarter'), // D4
    createSongNote(60, 15, 'quarter'), // C4
    createSongNote(62, 16, 'quarter'), // D4
    createSongNote(64, 17, 'quarter'), // E4
    createSongNote(64, 18, 'quarter'), // E4
    createSongNote(64, 19, 'quarter'), // E4
    createSongNote(64, 20, 'quarter'), // E4
    createSongNote(62, 21, 'quarter'), // D4
    createSongNote(62, 22, 'quarter'), // D4
    createSongNote(64, 23, 'quarter'), // E4
    createSongNote(62, 24, 'quarter'), // D4
    createSongNote(60, 25, 'half'), // C4
  ],
};
