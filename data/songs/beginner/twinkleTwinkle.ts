import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongFrame } from '../utils';

export const twinkleTwinkle: Song = {
  id: 'twinkle-twinkle',
  title: 'Twinkle Twinkle Little Star',
  difficulty: 'beginner',
  category: 'folk',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  frames: [
    // Twin-kle twin-kle lit-tle star
    createSongFrame([60], 0, 'quarter'), // C4
    createSongFrame([60], 1, 'quarter'), // C4
    createSongFrame([67], 2, 'quarter'), // G4
    createSongFrame([67], 3, 'quarter'), // G4
    createSongFrame([69], 4, 'quarter'), // A4
    createSongFrame([69], 5, 'quarter'), // A4
    createSongFrame([67], 6, 'half'), // G4
    // How I won-der what you are
    createSongFrame([65], 7, 'quarter'), // F4
    createSongFrame([65], 8, 'quarter'), // F4
    createSongFrame([64], 9, 'quarter'), // E4
    createSongFrame([64], 10, 'quarter'), // E4
    createSongFrame([62], 11, 'quarter'), // D4
    createSongFrame([62], 12, 'quarter'), // D4
    createSongFrame([60], 13, 'half'), // C4
  ],
};
