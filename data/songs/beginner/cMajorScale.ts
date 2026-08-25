import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongFrame } from '../utils';

export const cMajorScale: Song = {
  id: 'c-major-scale',
  title: 'C Major Scale',
  difficulty: 'beginner',
  category: 'exercise',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  frames: [
    createSongFrame([60], 0, 'quarter'), // C4
    createSongFrame([62], 1, 'quarter'), // D4
    createSongFrame([64], 2, 'quarter'), // E4
    createSongFrame([65], 3, 'quarter'), // F4
    createSongFrame([67], 4, 'quarter'), // G4
    createSongFrame([69], 5, 'quarter'), // A4
    createSongFrame([71], 6, 'quarter'), // B4
    createSongFrame([72], 7, 'quarter'), // C5
    createSongFrame([72], 8, 'quarter'), // C5
    createSongFrame([71], 9, 'quarter'), // B4
    createSongFrame([69], 10, 'quarter'), // A4
    createSongFrame([67], 11, 'quarter'), // G4
    createSongFrame([65], 12, 'quarter'), // F4
    createSongFrame([64], 13, 'quarter'), // E4
    createSongFrame([62], 14, 'quarter'), // D4
    createSongFrame([60], 15, 'quarter'), // C4
  ],
};
