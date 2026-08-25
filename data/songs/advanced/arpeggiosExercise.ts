import { ClefType } from '../../../types';
import { Song } from '../types';
import { createSongFrame } from '../utils';

export const arpeggiosExercise: Song = {
  id: 'arpeggios-exercise',
  title: 'Arpeggios Exercise',
  difficulty: 'advanced',
  category: 'exercise',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  frames: [
    // C Major arpeggio
    createSongFrame([60], 0, 'eighth'), // C4
    createSongFrame([64], 1, 'eighth'), // E4
    createSongFrame([67], 2, 'eighth'), // G4
    createSongFrame([72], 3, 'eighth'), // C5
    createSongFrame([67], 4, 'eighth'), // G4
    createSongFrame([64], 5, 'eighth'), // E4
    createSongFrame([60], 6, 'eighth'), // C4
    createSongFrame([60], 7, 'eighth'), // C4
    // G Major arpeggio
    createSongFrame([67], 8, 'eighth'), // G4
    createSongFrame([71], 9, 'eighth'), // B4
    createSongFrame([62], 10, 'eighth'), // D4
    createSongFrame([67], 11, 'eighth'), // G4
    createSongFrame([62], 12, 'eighth'), // D4
    createSongFrame([71], 13, 'eighth'), // B4
    createSongFrame([67], 14, 'eighth'), // G4
    createSongFrame([67], 15, 'eighth'), // G4
    // F Major arpeggio
    createSongFrame([65], 16, 'eighth'), // F4
    createSongFrame([69], 17, 'eighth'), // A4
    createSongFrame([60], 18, 'eighth'), // C4
    createSongFrame([65], 19, 'eighth'), // F4
    createSongFrame([60], 20, 'eighth'), // C4
    createSongFrame([69], 21, 'eighth'), // A4
    createSongFrame([65], 22, 'eighth'), // F4
    createSongFrame([65], 23, 'eighth'), // F4
  ],
};
