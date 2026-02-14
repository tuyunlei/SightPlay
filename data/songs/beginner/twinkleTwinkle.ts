import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongNote } from '../utils';

export const twinkleTwinkle: Song = {
  id: 'twinkle-twinkle',
  title: 'Twinkle Twinkle Little Star',
  difficulty: 'beginner',
  category: 'folk',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  notes: [
    // Twin-kle twin-kle lit-tle star
    createSongNote(60, 0, 'quarter'), // C4
    createSongNote(60, 1, 'quarter'), // C4
    createSongNote(67, 2, 'quarter'), // G4
    createSongNote(67, 3, 'quarter'), // G4
    createSongNote(69, 4, 'quarter'), // A4
    createSongNote(69, 5, 'quarter'), // A4
    createSongNote(67, 6, 'half'), // G4
    // How I won-der what you are
    createSongNote(65, 7, 'quarter'), // F4
    createSongNote(65, 8, 'quarter'), // F4
    createSongNote(64, 9, 'quarter'), // E4
    createSongNote(64, 10, 'quarter'), // E4
    createSongNote(62, 11, 'quarter'), // D4
    createSongNote(62, 12, 'quarter'), // D4
    createSongNote(60, 13, 'half'), // C4
  ],
};
