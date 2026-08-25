import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongFrame } from '../utils';

export const bassClefExercise: Song = {
  id: 'bass-clef-exercise',
  title: 'Bass Clef Exercise',
  difficulty: 'intermediate',
  category: 'exercise',
  clef: ClefType.BASS,
  timeSignature: { beats: 4, beatUnit: 4 },
  frames: [
    // C Major scale in bass clef
    createSongFrame([48], 0, 'quarter'), // C3
    createSongFrame([50], 1, 'quarter'), // D3
    createSongFrame([52], 2, 'quarter'), // E3
    createSongFrame([53], 3, 'quarter'), // F3
    createSongFrame([55], 4, 'quarter'), // G3
    createSongFrame([57], 5, 'quarter'), // A3
    createSongFrame([59], 6, 'quarter'), // B3
    createSongFrame([60], 7, 'quarter'), // C4
    createSongFrame([60], 8, 'quarter'), // C4
    createSongFrame([59], 9, 'quarter'), // B3
    createSongFrame([57], 10, 'quarter'), // A3
    createSongFrame([55], 11, 'quarter'), // G3
    createSongFrame([53], 12, 'quarter'), // F3
    createSongFrame([52], 13, 'quarter'), // E3
    createSongFrame([50], 14, 'quarter'), // D3
    createSongFrame([48], 15, 'quarter'), // C3
  ],
};
