import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongFrame } from '../utils';

export const minuetInG: Song = {
  id: 'minuet-in-g',
  title: 'Minuet in G',
  difficulty: 'intermediate',
  category: 'classical',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 3, beatUnit: 4 },
  frames: [
    createSongFrame([62], 0, 'quarter'), // D4
    createSongFrame([67], 1, 'eighth'), // G4
    createSongFrame([69], 2, 'eighth'), // A4
    createSongFrame([71], 3, 'eighth'), // B4
    createSongFrame([72], 4, 'eighth'), // C5
    createSongFrame([62], 5, 'quarter'), // D4
    createSongFrame([67], 6, 'quarter'), // G4
    createSongFrame([67], 7, 'quarter'), // G4
    createSongFrame([64], 8, 'quarter'), // E4
    createSongFrame([72], 9, 'eighth'), // C5
    createSongFrame([71], 10, 'eighth'), // B4
    createSongFrame([69], 11, 'eighth'), // A4
    createSongFrame([71], 12, 'eighth'), // B4
    createSongFrame([64], 13, 'quarter'), // E4
    createSongFrame([69], 14, 'quarter'), // A4
    createSongFrame([69], 15, 'quarter'), // A4
  ],
};
