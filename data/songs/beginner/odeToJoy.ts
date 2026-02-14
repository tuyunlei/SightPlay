import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongNote } from '../utils';

export const odeToJoy: Song = {
  id: 'ode-to-joy',
  title: 'Ode to Joy',
  difficulty: 'beginner',
  category: 'classical',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  notes: [
    createSongNote(64, 0, 'quarter'), // E4
    createSongNote(64, 1, 'quarter'), // E4
    createSongNote(65, 2, 'quarter'), // F4
    createSongNote(67, 3, 'quarter'), // G4
    createSongNote(67, 4, 'quarter'), // G4
    createSongNote(65, 5, 'quarter'), // F4
    createSongNote(64, 6, 'quarter'), // E4
    createSongNote(62, 7, 'quarter'), // D4
    createSongNote(60, 8, 'quarter'), // C4
    createSongNote(60, 9, 'quarter'), // C4
    createSongNote(62, 10, 'quarter'), // D4
    createSongNote(64, 11, 'quarter'), // E4
    createSongNote(64, 12, 'quarter'), // E4
    createSongNote(62, 13, 'eighth'), // D4
    createSongNote(62, 14, 'eighth'), // D4
    createSongNote(62, 15, 'half'), // D4
  ],
};
