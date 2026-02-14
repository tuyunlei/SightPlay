import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongNote } from '../utils';

export const bassClefExercise: Song = {
  id: 'bass-clef-exercise',
  title: 'Bass Clef Exercise',
  difficulty: 'intermediate',
  category: 'exercise',
  clef: ClefType.BASS,
  timeSignature: { beats: 4, beatUnit: 4 },
  notes: [
    // C Major scale in bass clef
    createSongNote(48, 0, 'quarter'), // C3
    createSongNote(50, 1, 'quarter'), // D3
    createSongNote(52, 2, 'quarter'), // E3
    createSongNote(53, 3, 'quarter'), // F3
    createSongNote(55, 4, 'quarter'), // G3
    createSongNote(57, 5, 'quarter'), // A3
    createSongNote(59, 6, 'quarter'), // B3
    createSongNote(60, 7, 'quarter'), // C4
    createSongNote(60, 8, 'quarter'), // C4
    createSongNote(59, 9, 'quarter'), // B3
    createSongNote(57, 10, 'quarter'), // A3
    createSongNote(55, 11, 'quarter'), // G3
    createSongNote(53, 12, 'quarter'), // F3
    createSongNote(52, 13, 'quarter'), // E3
    createSongNote(50, 14, 'quarter'), // D3
    createSongNote(48, 15, 'quarter'), // C3
  ],
};
