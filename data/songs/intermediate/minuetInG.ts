import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongNote } from '../utils';

export const minuetInG: Song = {
  id: 'minuet-in-g',
  title: 'Minuet in G',
  difficulty: 'intermediate',
  category: 'classical',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 3, beatUnit: 4 },
  notes: [
    createSongNote(62, 0, 'quarter'), // D4
    createSongNote(67, 1, 'eighth'), // G4
    createSongNote(69, 2, 'eighth'), // A4
    createSongNote(71, 3, 'eighth'), // B4
    createSongNote(72, 4, 'eighth'), // C5
    createSongNote(62, 5, 'quarter'), // D4
    createSongNote(67, 6, 'quarter'), // G4
    createSongNote(67, 7, 'quarter'), // G4
    createSongNote(64, 8, 'quarter'), // E4
    createSongNote(72, 9, 'eighth'), // C5
    createSongNote(71, 10, 'eighth'), // B4
    createSongNote(69, 11, 'eighth'), // A4
    createSongNote(71, 12, 'eighth'), // B4
    createSongNote(64, 13, 'quarter'), // E4
    createSongNote(69, 14, 'quarter'), // A4
    createSongNote(69, 15, 'quarter'), // A4
  ],
};
