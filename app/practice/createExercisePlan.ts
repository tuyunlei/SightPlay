import {
  createFiniteExercise,
  createRandomExercise,
  parseScientificPitch,
  type Clef,
  type ExercisePlan,
  type RandomExerciseConfig,
} from '@sightplay/practice';

import { getSongById } from '../../data/songs';
import type { GeneratedChallenge } from '../../types';

export const DEFAULT_RANDOM_CONFIG: RandomExerciseConfig = {
  clef: 'treble',
  practiceRange: 'combined',
  handMode: 'right-hand',
  includeAccidentals: false,
};

export function createInitialRandomExercise(seed: number): ExercisePlan {
  const result = createRandomExercise({ seed, config: DEFAULT_RANDOM_CONFIG });
  if (!result.ok) throw new Error('The browser seed port returned an invalid random seed');
  return result.value;
}

export function createSongExercise(
  songId: string
): Extract<ExercisePlan, { kind: 'finite' }> | null {
  const song = getSongById(songId);
  if (!song) return null;
  const result = createFiniteExercise({
    source: 'song',
    id: song.id,
    clef: song.clef,
    frames: song.notes.map((note) => ({
      pitches: [note.midi],
      ...(note.duration ? { duration: note.duration } : {}),
    })),
    metadata: { title: song.title, difficulty: song.difficulty },
  });
  return result.ok ? result.value : null;
}

export function createCoachExercise(
  challenge: GeneratedChallenge,
  clef: Clef
): Extract<ExercisePlan, { kind: 'finite' }> | null {
  const pitches = challenge.notes.map(parseScientificPitch);
  if (pitches.some((pitch) => pitch === null)) return null;
  const id = `coach:${challenge.title.trim()}:${challenge.notes.join(',')}`;
  const result = createFiniteExercise({
    source: 'coach',
    id,
    clef,
    frames: pitches.map((pitch) => ({ pitches: [Number(pitch)] })),
    metadata: {
      title: challenge.title,
      description: challenge.description,
      noteLabels: challenge.notes,
    },
  });
  return result.ok ? result.value : null;
}
