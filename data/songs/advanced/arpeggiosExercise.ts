import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongNote } from '../utils';

export const arpeggiosExercise: Song = {
  id: 'arpeggios-exercise',
  title: 'Arpeggios Exercise',
  difficulty: 'advanced',
  category: 'exercise',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  notes: [
    // C Major arpeggio
    createSongNote(60, 0, 'eighth'), // C4
    createSongNote(64, 1, 'eighth'), // E4
    createSongNote(67, 2, 'eighth'), // G4
    createSongNote(72, 3, 'eighth'), // C5
    createSongNote(67, 4, 'eighth'), // G4
    createSongNote(64, 5, 'eighth'), // E4
    createSongNote(60, 6, 'eighth'), // C4
    createSongNote(60, 7, 'eighth'), // C4
    // G Major arpeggio
    createSongNote(67, 8, 'eighth'), // G4
    createSongNote(71, 9, 'eighth'), // B4
    createSongNote(62, 10, 'eighth'), // D4
    createSongNote(67, 11, 'eighth'), // G4
    createSongNote(62, 12, 'eighth'), // D4
    createSongNote(71, 13, 'eighth'), // B4
    createSongNote(67, 14, 'eighth'), // G4
    createSongNote(67, 15, 'eighth'), // G4
    // F Major arpeggio
    createSongNote(65, 16, 'eighth'), // F4
    createSongNote(69, 17, 'eighth'), // A4
    createSongNote(60, 18, 'eighth'), // C4
    createSongNote(65, 19, 'eighth'), // F4
    createSongNote(60, 20, 'eighth'), // C4
    createSongNote(69, 21, 'eighth'), // A4
    createSongNote(65, 22, 'eighth'), // F4
    createSongNote(65, 23, 'eighth'), // F4
  ],
};
