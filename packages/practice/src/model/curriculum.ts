import { createFiniteExercise, createRandomSeed, type FiniteExerciseResult } from './exercise';
import type { CurriculumLessonId, ExerciseFrameRole, NoteDuration, RandomSeed } from './types';

export interface CurriculumLessonSummary {
  readonly id: CurriculumLessonId;
  readonly order: number;
  readonly pitchCount: number;
}

export const CURRICULUM_LESSONS: readonly CurriculumLessonSummary[] = [
  { id: 'landmark-steps', order: 1, pitchCount: 3 },
  { id: 'five-finger-phrases', order: 2, pitchCount: 5 },
  { id: 'familiar-variations', order: 3, pitchCount: 6 },
];

type LessonRecipe = {
  readonly id: CurriculumLessonId;
  readonly pitches: readonly number[];
  readonly maxLeap: number;
  readonly familiarVariants: readonly (readonly number[])[];
};

const RECIPES: Readonly<Record<CurriculumLessonId, LessonRecipe>> = {
  'landmark-steps': {
    id: 'landmark-steps',
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
    pitches: [60, 62, 64, 65, 67, 69],
    maxLeap: 2,
    familiarVariants: [
      [60, 60, 67, 67, 69, 67, 65, 65, 64, 64, 62, 60],
      [60, 62, 64, 60, 67, 69, 67, 65, 64, 62, 60],
      [64, 64, 65, 67, 69, 67, 65, 64, 62, 62, 60],
    ],
  },
};

export function isCurriculumLessonId(value: string): value is CurriculumLessonId {
  return value in RECIPES;
}

export function createCurriculumExercise(input: {
  readonly lessonId: CurriculumLessonId;
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
    clef: 'treble',
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
  return pitches.map((pitch, index) => ({
    pitches: [pitch],
    role,
    duration: (index === pitches.length - 1 ? 'half' : 'quarter') as NoteDuration,
  }));
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
