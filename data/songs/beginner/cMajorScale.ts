import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongNote } from '../utils';

export const cMajorScale: Song = {
  id: 'c-major-scale',
  title: 'C Major Scale',
  difficulty: 'beginner',
  category: 'exercise',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  notes: [
    createSongNote(60, 0, 'quarter'), // C4
    createSongNote(62, 1, 'quarter'), // D4
    createSongNote(64, 2, 'quarter'), // E4
    createSongNote(65, 3, 'quarter'), // F4
    createSongNote(67, 4, 'quarter'), // G4
    createSongNote(69, 5, 'quarter'), // A4
    createSongNote(71, 6, 'quarter'), // B4
    createSongNote(72, 7, 'quarter'), // C5
    createSongNote(72, 8, 'quarter'), // C5
    createSongNote(71, 9, 'quarter'), // B4
    createSongNote(69, 10, 'quarter'), // A4
    createSongNote(67, 11, 'quarter'), // G4
    createSongNote(65, 12, 'quarter'), // F4
    createSongNote(64, 13, 'quarter'), // E4
    createSongNote(62, 14, 'quarter'), // D4
    createSongNote(60, 15, 'quarter'), // C4
  ],
};
