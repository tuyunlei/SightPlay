import { createFiniteExercise, createRandomSeed, type FiniteExerciseResult } from './exercise';
import type {
  Clef,
  CurriculumLessonId,
  ExerciseFrameRole,
  HandMode,
  PlayableCurriculumLessonId,
  RandomSeed,
} from './types';

export type CurriculumImplementationStatus = 'available' | 'planned';
export type CurriculumModuleId =
  | 'foundations'
  | 'intervals'
  | 'grand-staff'
  | 'rhythm'
  | 'tonal-patterns'
  | 'expression'
  | 'fluency';
export type CurriculumChapterId =
  | 'keyboard-map'
  | 'landmarks'
  | 'direction'
  | 'steps-and-thirds'
  | 'wider-intervals'
  | 'range'
  | 'coordination'
  | 'pulse-and-values'
  | 'rhythm-patterns'
  | 'melody-and-key'
  | 'harmony'
  | 'technique-and-expression'
  | 'first-sight'
  | 'long-term-transfer';
export type CurriculumCapability =
  | 'pre-staff-notation'
  | 'clef-per-frame'
  | 'polyphonic-score'
  | 'rhythm-engine'
  | 'key-signatures'
  | 'chord-reading'
  | 'fingering-feedback'
  | 'articulation-scoring'
  | 'velocity-dynamics'
  | 'pedal-input'
  | 'preview-timer'
  | 'continuous-pulse'
  | 'adaptive-progress'
  | 'repertoire-library';

export interface CurriculumLessonSummary {
  readonly id: CurriculumLessonId;
  readonly order: number;
  readonly status: CurriculumImplementationStatus;
  readonly requires?: readonly CurriculumCapability[];
}

export interface CurriculumChapter {
  readonly id: CurriculumChapterId;
  readonly order: number;
  readonly lessons: readonly CurriculumLessonSummary[];
}

export interface CurriculumModule {
  readonly id: CurriculumModuleId;
  readonly order: number;
  readonly chapters: readonly CurriculumChapter[];
}

const available = (id: PlayableCurriculumLessonId, order: number): CurriculumLessonSummary => ({
  id,
  order,
  status: 'available',
});
const planned = (
  id: Exclude<CurriculumLessonId, PlayableCurriculumLessonId>,
  order: number,
  ...requires: readonly CurriculumCapability[]
): CurriculumLessonSummary => ({ id, order, status: 'planned', requires });

export const CURRICULUM_MODULES: readonly CurriculumModule[] = [
  {
    id: 'foundations',
    order: 1,
    chapters: [
      {
        id: 'keyboard-map',
        order: 1,
        lessons: [
          planned('keyboard-groups', 1, 'pre-staff-notation'),
          planned('key-names', 2, 'pre-staff-notation'),
        ],
      },
      {
        id: 'landmarks',
        order: 2,
        lessons: [
          available('landmark-steps', 1),
          available('treble-landmarks', 2),
          available('bass-landmarks', 3),
        ],
      },
      {
        id: 'direction',
        order: 3,
        lessons: [available('repeated-notes', 1), available('ascending-descending', 2)],
      },
    ],
  },
  {
    id: 'intervals',
    order: 2,
    chapters: [
      {
        id: 'steps-and-thirds',
        order: 1,
        lessons: [
          available('five-finger-phrases', 1),
          available('thirds-in-treble', 2),
          available('thirds-in-bass', 3),
        ],
      },
      {
        id: 'wider-intervals',
        order: 2,
        lessons: [available('fourths-and-fifths', 1), available('mixed-interval-phrases', 2)],
      },
      {
        id: 'range',
        order: 3,
        lessons: [
          available('expanding-treble', 1),
          available('expanding-bass', 2),
          planned('ledger-lines', 3, 'pre-staff-notation'),
        ],
      },
    ],
  },
  {
    id: 'grand-staff',
    order: 3,
    chapters: [
      {
        id: 'coordination',
        order: 1,
        lessons: [
          planned('hand-alternation', 1, 'clef-per-frame'),
          planned('hands-together', 2, 'polyphonic-score'),
          planned('independent-voices', 3, 'polyphonic-score'),
        ],
      },
    ],
  },
  {
    id: 'rhythm',
    order: 4,
    chapters: [
      {
        id: 'pulse-and-values',
        order: 1,
        lessons: [
          planned('steady-pulse', 1, 'rhythm-engine'),
          planned('note-values', 2, 'rhythm-engine'),
          planned('rests', 3, 'rhythm-engine'),
        ],
      },
      {
        id: 'rhythm-patterns',
        order: 2,
        lessons: [
          planned('eighth-note-patterns', 1, 'rhythm-engine'),
          planned('dotted-notes-and-ties', 2, 'rhythm-engine'),
          planned('compound-meter', 3, 'rhythm-engine'),
          planned('syncopation', 4, 'rhythm-engine'),
        ],
      },
    ],
  },
  {
    id: 'tonal-patterns',
    order: 5,
    chapters: [
      {
        id: 'melody-and-key',
        order: 1,
        lessons: [
          available('familiar-variations', 1),
          available('c-major-patterns', 2),
          planned('g-and-f-major', 3, 'key-signatures'),
          planned('transposition', 4, 'key-signatures'),
        ],
      },
      {
        id: 'harmony',
        order: 2,
        lessons: [
          planned('chord-shapes', 1, 'chord-reading'),
          planned('arpeggio-shapes', 2, 'chord-reading'),
        ],
      },
    ],
  },
  {
    id: 'expression',
    order: 6,
    chapters: [
      {
        id: 'technique-and-expression',
        order: 1,
        lessons: [
          planned('fingering', 1, 'fingering-feedback'),
          planned('articulation', 2, 'articulation-scoring'),
          planned('dynamics', 3, 'velocity-dynamics'),
          planned('phrasing', 4, 'articulation-scoring'),
          planned('pedal', 5, 'pedal-input'),
        ],
      },
    ],
  },
  {
    id: 'fluency',
    order: 7,
    chapters: [
      {
        id: 'first-sight',
        order: 1,
        lessons: [
          planned('preview-and-scan', 1, 'preview-timer'),
          available('first-sight-mix', 2),
          planned('continuous-reading', 3, 'continuous-pulse'),
          planned('error-recovery', 4, 'continuous-pulse'),
        ],
      },
      {
        id: 'long-term-transfer',
        order: 2,
        lessons: [
          planned('adaptive-review', 1, 'adaptive-progress'),
          planned('repertoire-transfer', 2, 'repertoire-library'),
        ],
      },
    ],
  },
];

export const CURRICULUM_LESSONS: readonly CurriculumLessonSummary[] = CURRICULUM_MODULES.flatMap(
  (module) => module.chapters.flatMap((chapter) => chapter.lessons)
);
export const PLAYABLE_CURRICULUM_LESSONS = CURRICULUM_LESSONS.filter(
  (lesson): lesson is CurriculumLessonSummary & { readonly id: PlayableCurriculumLessonId } =>
    lesson.status === 'available'
);

type LessonRecipe = {
  readonly id: PlayableCurriculumLessonId;
  readonly clef: Clef;
  readonly handMode: HandMode;
  readonly pitches: readonly number[];
  readonly maxLeap: number;
  readonly familiarVariants: readonly (readonly number[])[];
};

const RECIPES: Readonly<Record<PlayableCurriculumLessonId, LessonRecipe>> = {
  'landmark-steps': {
    id: 'landmark-steps',
    clef: 'treble',
    handMode: 'right-hand',
    pitches: [60, 62, 64],
    maxLeap: 1,
    familiarVariants: [
      [64, 62, 60, 62, 64, 64, 62],
      [64, 62, 60, 62, 64, 62, 60],
      [64, 62, 60, 60, 62, 64, 64],
    ],
  },
  'five-finger-phrases': {
    id: 'five-finger-phrases',
    clef: 'treble',
    handMode: 'right-hand',
    pitches: [60, 62, 64, 65, 67],
    maxLeap: 1,
    familiarVariants: [
      [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62],
      [64, 65, 67, 67, 65, 64, 62, 60, 62, 64, 62, 60],
      [67, 65, 64, 62, 60, 60, 62, 64, 65, 64, 62, 60],
    ],
  },
  'familiar-variations': {
    id: 'familiar-variations',
    clef: 'treble',
    handMode: 'right-hand',
    pitches: [60, 62, 64, 65, 67, 69],
    maxLeap: 2,
    familiarVariants: [
      [60, 60, 67, 67, 69, 67, 65, 65, 64, 64, 62, 60],
      [60, 62, 64, 60, 67, 69, 67, 65, 64, 62, 60],
      [64, 64, 65, 67, 69, 67, 65, 64, 62, 62, 60],
    ],
  },
  'treble-landmarks': recipe('treble-landmarks', 'treble', 'right-hand', [60, 64, 67, 72], 1),
  'bass-landmarks': recipe('bass-landmarks', 'bass', 'left-hand', [48, 53, 60], 1),
  'repeated-notes': recipe('repeated-notes', 'treble', 'right-hand', [60, 62, 64], 1),
  'ascending-descending': recipe(
    'ascending-descending',
    'treble',
    'right-hand',
    [60, 62, 64, 65, 67],
    1
  ),
  'thirds-in-treble': recipe('thirds-in-treble', 'treble', 'right-hand', [60, 62, 64, 65, 67], 2),
  'thirds-in-bass': recipe('thirds-in-bass', 'bass', 'left-hand', [48, 50, 52, 53, 55], 2),
  'fourths-and-fifths': recipe(
    'fourths-and-fifths',
    'treble',
    'right-hand',
    [60, 62, 64, 65, 67],
    4
  ),
  'mixed-interval-phrases': recipe(
    'mixed-interval-phrases',
    'treble',
    'right-hand',
    [60, 62, 64, 65, 67, 69],
    3
  ),
  'expanding-treble': recipe(
    'expanding-treble',
    'treble',
    'right-hand',
    [60, 62, 64, 65, 67, 69, 71, 72],
    2
  ),
  'expanding-bass': recipe(
    'expanding-bass',
    'bass',
    'left-hand',
    [48, 50, 52, 53, 55, 57, 59, 60],
    2
  ),
  'c-major-patterns': recipe(
    'c-major-patterns',
    'treble',
    'right-hand',
    [60, 62, 64, 65, 67, 69, 71, 72],
    3
  ),
  'first-sight-mix': recipe(
    'first-sight-mix',
    'treble',
    'right-hand',
    [60, 62, 64, 65, 67, 69, 71, 72],
    4
  ),
};

export function isCurriculumLessonId(value: string): value is CurriculumLessonId {
  return CURRICULUM_LESSONS.some((lesson) => lesson.id === value);
}

export function isPlayableCurriculumLessonId(value: string): value is PlayableCurriculumLessonId {
  return value in RECIPES;
}

export function createCurriculumExercise(input: {
  readonly lessonId: PlayableCurriculumLessonId;
  readonly seed: number;
}): FiniteExerciseResult {
  const seed = createRandomSeed(input.seed);
  if (seed === null) return { ok: false, issue: 'invalidExercise' };
  const recipe = RECIPES[input.lessonId];
  const guided = generatePhrase(recipe, seed, 8, 11);
  let transfer = generatePhrase(recipe, seed, 8, 97);
  if (samePhrase(guided, transfer)) transfer = forceDistinct(transfer, recipe.pitches);
  const familiar = selectFamiliarVariant(recipe, seed);
  const warmup = warmupPhrase(recipe.pitches);
  const frames = [
    ...framesFor(warmup, 'warmup'),
    ...framesFor(guided, 'guided'),
    ...framesFor(familiar, 'familiar'),
    ...framesFor(transfer, 'transfer'),
  ];

  return createFiniteExercise({
    source: 'lesson',
    id: `lesson:${recipe.id}:${seed}`,
    clef: recipe.clef,
    handMode: recipe.handMode,
    frames,
    metadata: { curriculum: { lessonId: recipe.id, seed } },
  });
}

function warmupPhrase(pitches: readonly number[]): readonly number[] {
  const middle = pitches[Math.floor((pitches.length - 1) / 2)];
  return [pitches[0], pitches[0], middle, pitches[0]];
}

function selectFamiliarVariant(recipe: LessonRecipe, seed: RandomSeed): readonly number[] {
  const index = Math.floor(randomUnit(seed, 53) * recipe.familiarVariants.length);
  return recipe.familiarVariants[index];
}

function generatePhrase(
  recipe: LessonRecipe,
  seed: RandomSeed,
  length: number,
  salt: number
): readonly number[] {
  const indices: number[] = [];
  const startSpan = Math.max(1, recipe.pitches.length - 2);
  indices.push(Math.floor(randomUnit(seed, salt) * startSpan));

  for (let position = 1; position < length - 1; position += 1) {
    const previous = indices[position - 1];
    const candidates = Array.from(
      { length: recipe.maxLeap * 2 + 1 },
      (_, offset) => previous + offset - recipe.maxLeap
    ).filter((candidate) => candidate >= 0 && candidate < recipe.pitches.length);
    const withoutThirdRepeat =
      position >= 2 && indices[position - 2] === previous
        ? candidates.filter((candidate) => candidate !== previous)
        : candidates;
    const basePool = withoutThirdRepeat.length > 0 ? withoutThirdRepeat : candidates;
    const cadenceCandidates = recipe.pitches.length >= 5 ? [0, 2] : [0];
    const cadenceDistance = (candidate: number) =>
      Math.min(...cadenceCandidates.map((cadence) => Math.abs(cadence - candidate)));
    const closestDistance = Math.min(...basePool.map(cadenceDistance));
    const pool =
      position === length - 2
        ? basePool.filter((candidate) => cadenceDistance(candidate) === closestDistance)
        : basePool;
    indices.push(pool[Math.floor(randomUnit(seed, salt + position) * pool.length)]);
  }

  const cadenceCandidates = recipe.pitches.length >= 5 ? [0, 2] : [0];
  const previous = indices.at(-1) ?? 0;
  const nearestDistance = Math.min(
    ...cadenceCandidates.map((cadence) => Math.abs(cadence - previous))
  );
  const reachableCadences = cadenceCandidates.filter(
    (cadence) => Math.abs(cadence - previous) === nearestDistance
  );
  indices.push(
    reachableCadences[Math.floor(randomUnit(seed, salt + length) * reachableCadences.length)]
  );
  return indices.map((index) => recipe.pitches[index]);
}

function framesFor(pitches: readonly number[], role: ExerciseFrameRole) {
  return pitches.map((pitch) => ({
    pitches: [pitch],
    role,
    duration: 'quarter' as const,
  }));
}

function recipe(
  id: PlayableCurriculumLessonId,
  clef: Clef,
  handMode: HandMode,
  pitches: readonly number[],
  maxLeap: number
): LessonRecipe {
  const ascending = pitches.slice(0, Math.min(8, pitches.length));
  const descending = [...ascending].reverse();
  const arch = [...ascending, ...descending.slice(1)].slice(0, 12);
  return { id, clef, handMode, pitches, maxLeap, familiarVariants: [ascending, descending, arch] };
}

function samePhrase(first: readonly number[], second: readonly number[]): boolean {
  return first.length === second.length && first.every((pitch, index) => pitch === second[index]);
}

function forceDistinct(phrase: readonly number[], allowed: readonly number[]): readonly number[] {
  const replacement = allowed.find((pitch) => pitch !== phrase[0]) ?? phrase[0];
  return [replacement, ...phrase.slice(1)];
}

function randomUnit(seed: RandomSeed, salt: number): number {
  let value = (Number(seed) + Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 0x100000000;
}
