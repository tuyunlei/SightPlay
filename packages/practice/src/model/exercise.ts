import {
  asMidiPitch,
  asRandomSeed,
  type Clef,
  type ExerciseMetadata,
  type ExerciseFrameRole,
  type ExercisePlan,
  type HandMode,
  type MidiPitch,
  type NoteDuration,
  type PracticeRange,
  type RandomExerciseConfig,
  type RandomSeed,
  type ScoreFrame,
} from './types';

export type ExerciseResult =
  | { readonly ok: true; readonly value: ExercisePlan }
  | { readonly ok: false; readonly issue: 'invalidExercise' };

export type FiniteExerciseResult =
  | { readonly ok: true; readonly value: Extract<ExercisePlan, { kind: 'finite' }> }
  | { readonly ok: false; readonly issue: 'invalidExercise' };

export type RandomExerciseResult =
  | { readonly ok: true; readonly value: Extract<ExercisePlan, { kind: 'generated' }> }
  | { readonly ok: false; readonly issue: 'invalidExercise' };

export interface FiniteFrameInput {
  readonly pitches: readonly number[];
  readonly duration?: NoteDuration;
  readonly role?: ExerciseFrameRole;
}

export function createMidiPitch(value: number): MidiPitch | null {
  return Number.isInteger(value) && value >= 0 && value <= 127 ? asMidiPitch(value) : null;
}

export function createRandomSeed(value: number): RandomSeed | null {
  return Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff
    ? asRandomSeed(value)
    : null;
}

export function parseScientificPitch(value: string): MidiPitch | null {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(value.trim());
  if (!match) return null;
  const natural = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(match[1]);
  const semitones = [0, 2, 4, 5, 7, 9, 11];
  const octave = Number(match[3]);
  return createMidiPitch((octave + 1) * 12 + semitones[natural] + (match[2] ? 1 : 0));
}

export function createFiniteExercise(input: {
  readonly source: 'song' | 'coach' | 'lesson';
  readonly id: string;
  readonly clef: Clef;
  readonly handMode?: HandMode;
  readonly frames: readonly FiniteFrameInput[];
  readonly metadata?: Omit<ExerciseMetadata, 'id'>;
}): FiniteExerciseResult {
  const id = input.id.trim();
  const frames = input.frames.map((frame, index) => decodeFrame(id, frame, index));
  if (!id || frames.length === 0 || frames.some((frame) => frame === null)) {
    return { ok: false, issue: 'invalidExercise' };
  }
  return {
    ok: true,
    value: {
      kind: 'finite',
      source: input.source,
      frames: frames as [ScoreFrame, ...ScoreFrame[]],
      metadata: { id, ...input.metadata },
      clef: input.clef,
      handMode: input.handMode ?? 'right-hand',
    },
  };
}

export function createRandomExercise(input: {
  readonly seed: number;
  readonly config: RandomExerciseConfig;
  readonly id?: string;
}): RandomExerciseResult {
  const seed = createRandomSeed(input.seed);
  if (seed === null) return { ok: false, issue: 'invalidExercise' };
  return {
    ok: true,
    value: {
      kind: 'generated',
      source: 'random',
      seed,
      config: input.config,
      metadata: { id: input.id?.trim() || `random-${seed}` },
    },
  };
}

function decodeFrame(id: string, input: FiniteFrameInput, index: number): ScoreFrame | null {
  const pitches = input.pitches.map(createMidiPitch);
  if (
    pitches.length === 0 ||
    pitches.some((pitch) => pitch === null) ||
    new Set(pitches).size !== pitches.length
  ) {
    return null;
  }
  return {
    id: `${id}:${index}`,
    index,
    pitches: pitches as [MidiPitch, ...MidiPitch[]],
    ...(input.duration ? { duration: input.duration } : {}),
    ...(input.role ? { role: input.role } : {}),
  };
}

export function frameAt(plan: ExercisePlan, index: number): ScoreFrame | null {
  if (!Number.isSafeInteger(index) || index < 0) return null;
  return plan.kind === 'finite' ? (plan.frames[index] ?? null) : generatedFrame(plan, index);
}

function generatedFrame(
  plan: Extract<ExercisePlan, { kind: 'generated' }>,
  index: number
): ScoreFrame {
  const pitches =
    plan.config.handMode === 'both-hands'
      ? [
          randomPitch(plan.seed, index, 'treble', 'combined', plan.config.includeAccidentals, 0),
          randomPitch(plan.seed, index, 'bass', 'central', plan.config.includeAccidentals, 1),
        ]
      : [
          randomPitch(
            plan.seed,
            index,
            plan.config.handMode === 'left-hand' ? 'bass' : plan.config.clef,
            plan.config.practiceRange,
            plan.config.includeAccidentals,
            0
          ),
        ];
  return {
    id: `random:${plan.seed}:${index}`,
    index,
    pitches: pitches as [MidiPitch, ...MidiPitch[]],
  };
}

function randomPitch(
  seed: RandomSeed,
  index: number,
  clef: Clef,
  range: PracticeRange,
  includeAccidentals: boolean,
  lane: number
): MidiPitch {
  const bounds = midiRange(clef, range);
  const value = pseudoRandom(Number(seed), index * 2 + lane);
  const raw = Math.floor(value * (bounds.max - bounds.min + 1)) + bounds.min;
  const midi = !includeAccidentals && [1, 3, 6, 8, 10].includes(raw % 12) ? raw - 1 : raw;
  return asMidiPitch(midi);
}

function midiRange(clef: Clef, range: PracticeRange) {
  const center = clef === 'treble' ? { min: 60, max: 71 } : { min: 48, max: 59 };
  if (range === 'central') return center;
  if (range === 'upper') return { min: center.min + 12, max: center.max + 12 };
  return { min: center.min, max: center.max + 12 };
}

function pseudoRandom(seed: number, index: number): number {
  let value = (seed + Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 0x100000000;
}
