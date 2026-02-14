import { createNoteFromMidi } from '../../domain/note';
import { ClefType, Duration, Note } from '../../types';

import { Song } from './types';

const createSongNote = (
  midi: number,
  globalIndex: number,
  duration: Duration = 'quarter'
): Note => {
  const note = createNoteFromMidi(midi, globalIndex, duration);
  return note;
};

// Beginner: Twinkle Twinkle Little Star (C Major, first phrase)
const twinkleTwinkle: Song = {
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

// Beginner: Ode to Joy (first phrase)
const odeToJoy: Song = {
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

// Beginner: C Major Scale Exercise
const cMajorScale: Song = {
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

// Intermediate: Mary Had a Little Lamb
const maryHadLittleLamb: Song = {
  id: 'mary-had-little-lamb',
  title: 'Mary Had a Little Lamb',
  difficulty: 'intermediate',
  category: 'folk',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  notes: [
    // Ma-ry had a lit-tle lamb
    createSongNote(64, 0, 'quarter'), // E4
    createSongNote(62, 1, 'quarter'), // D4
    createSongNote(60, 2, 'quarter'), // C4
    createSongNote(62, 3, 'quarter'), // D4
    createSongNote(64, 4, 'quarter'), // E4
    createSongNote(64, 5, 'quarter'), // E4
    createSongNote(64, 6, 'half'), // E4
    // Lit-tle lamb, lit-tle lamb
    createSongNote(62, 7, 'quarter'), // D4
    createSongNote(62, 8, 'quarter'), // D4
    createSongNote(62, 9, 'half'), // D4
    createSongNote(64, 10, 'quarter'), // E4
    createSongNote(67, 11, 'quarter'), // G4
    createSongNote(67, 12, 'half'), // G4
    // Ma-ry had a lit-tle lamb
    createSongNote(64, 13, 'quarter'), // E4
    createSongNote(62, 14, 'quarter'), // D4
    createSongNote(60, 15, 'quarter'), // C4
    createSongNote(62, 16, 'quarter'), // D4
    createSongNote(64, 17, 'quarter'), // E4
    createSongNote(64, 18, 'quarter'), // E4
    createSongNote(64, 19, 'quarter'), // E4
    createSongNote(64, 20, 'quarter'), // E4
    createSongNote(62, 21, 'quarter'), // D4
    createSongNote(62, 22, 'quarter'), // D4
    createSongNote(64, 23, 'quarter'), // E4
    createSongNote(62, 24, 'quarter'), // D4
    createSongNote(60, 25, 'half'), // C4
  ],
};

// Intermediate: Minuet in G (simplified excerpt)
const minuetInG: Song = {
  id: 'minuet-in-g',
  title: 'Minuet in G',
  difficulty: 'intermediate',
  category: 'classical',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 3, beatUnit: 4 },
  notes: [
    createSongNote(62, 0, 'quarter'), // D4
    createSongNote(67, 1, 'eighth'), // G4
    createSongNote(69, 2, 'eighth'), // A4
    createSongNote(71, 3, 'eighth'), // B4
    createSongNote(72, 4, 'eighth'), // C5
    createSongNote(62, 5, 'quarter'), // D4
    createSongNote(67, 6, 'quarter'), // G4
    createSongNote(67, 7, 'quarter'), // G4
    createSongNote(64, 8, 'quarter'), // E4
    createSongNote(72, 9, 'eighth'), // C5
    createSongNote(71, 10, 'eighth'), // B4
    createSongNote(69, 11, 'eighth'), // A4
    createSongNote(71, 12, 'eighth'), // B4
    createSongNote(64, 13, 'quarter'), // E4
    createSongNote(69, 14, 'quarter'), // A4
    createSongNote(69, 15, 'quarter'), // A4
  ],
};

// Advanced: Canon in D (simplified opening)
const canonInD: Song = {
  id: 'canon-in-d',
  title: 'Canon in D',
  difficulty: 'advanced',
  category: 'classical',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  notes: [
    // First measure
    createSongNote(66, 0, 'half'), // F#4
    createSongNote(64, 1, 'half'), // E4
    // Second measure
    createSongNote(62, 2, 'half'), // D4
    createSongNote(61, 3, 'half'), // C#4
    // Third measure
    createSongNote(59, 4, 'half'), // B3
    createSongNote(57, 5, 'half'), // A3
    // Fourth measure
    createSongNote(59, 6, 'half'), // B3
    createSongNote(61, 7, 'half'), // C#4
    // Fifth measure (melody starts)
    createSongNote(66, 8, 'quarter'), // F#4
    createSongNote(64, 9, 'quarter'), // E4
    createSongNote(66, 10, 'quarter'), // F#4
    createSongNote(61, 11, 'quarter'), // C#4
    // Sixth measure
    createSongNote(62, 12, 'quarter'), // D4
    createSongNote(61, 13, 'quarter'), // C#4
    createSongNote(62, 14, 'quarter'), // D4
    createSongNote(57, 15, 'quarter'), // A3
    // Seventh measure
    createSongNote(59, 16, 'quarter'), // B3
    createSongNote(57, 17, 'quarter'), // A3
    createSongNote(59, 18, 'quarter'), // B3
    createSongNote(66, 19, 'quarter'), // F#4
    // Eighth measure
    createSongNote(64, 20, 'quarter'), // E4
    createSongNote(66, 21, 'quarter'), // F#4
    createSongNote(64, 22, 'eighth'), // E4
    createSongNote(62, 23, 'eighth'), // D4
    createSongNote(64, 24, 'quarter'), // E4
    createSongNote(61, 25, 'quarter'), // C#4
  ],
};

// Advanced: Arpeggios Exercise
const arpeggiosExercise: Song = {
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

// Bass clef exercise for left hand
const bassClefExercise: Song = {
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

export const SONG_LIBRARY: Song[] = [
  twinkleTwinkle,
  odeToJoy,
  cMajorScale,
  maryHadLittleLamb,
  minuetInG,
  canonInD,
  arpeggiosExercise,
  bassClefExercise,
];

export const getSongById = (id: string): Song | undefined => {
  return SONG_LIBRARY.find((song) => song.id === id);
};

export const getSongsByDifficulty = (difficulty: string) => {
  return SONG_LIBRARY.filter((song) => song.difficulty === difficulty);
};

export const getSongsByCategory = (category: string) => {
  return SONG_LIBRARY.filter((song) => song.category === category);
};
