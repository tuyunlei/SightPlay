import { arpeggiosExercise } from './advanced/arpeggiosExercise';
import { canonInD } from './advanced/canonInD';
import { cMajorScale } from './beginner/cMajorScale';
import { odeToJoy } from './beginner/odeToJoy';
import { twinkleTwinkle } from './beginner/twinkleTwinkle';
import { bassClefExercise } from './intermediate/bassClefExercise';
import { maryHadLittleLamb } from './intermediate/maryHadLittleLamb';
import { minuetInG } from './intermediate/minuetInG';
import { Song } from './types';

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
