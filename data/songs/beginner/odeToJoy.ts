import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongFrame } from '../utils';

export const odeToJoy: Song = {
  id: 'ode-to-joy',
  title: 'Ode to Joy',
  difficulty: 'beginner',
  category: 'classical',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  frames: [
    createSongFrame([64], 0, 'quarter'), // E4
    createSongFrame([64], 1, 'quarter'), // E4
    createSongFrame([65], 2, 'quarter'), // F4
    createSongFrame([67], 3, 'quarter'), // G4
    createSongFrame([67], 4, 'quarter'), // G4
    createSongFrame([65], 5, 'quarter'), // F4
    createSongFrame([64], 6, 'quarter'), // E4
    createSongFrame([62], 7, 'quarter'), // D4
    createSongFrame([60], 8, 'quarter'), // C4
    createSongFrame([60], 9, 'quarter'), // C4
    createSongFrame([62], 10, 'quarter'), // D4
    createSongFrame([64], 11, 'quarter'), // E4
    createSongFrame([64], 12, 'quarter'), // E4
    createSongFrame([62], 13, 'eighth'), // D4
    createSongFrame([62], 14, 'eighth'), // D4
    createSongFrame([62], 15, 'half'), // D4
  ],
};
