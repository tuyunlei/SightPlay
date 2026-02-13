import { BASS_RANGE, TREBLE_RANGE } from '../config/music';
import { getPracticeMidiRange } from '../config/practice';
import { ClefType, Note, PracticeRangeMode } from '../types';

import { createNoteFromMidi } from './note';

export const DEFAULT_QUEUE_SIZE = 20;

export const generateRandomNoteData = (
  clef: ClefType,
  globalIdx: number,
  practiceRange?: PracticeRangeMode,
  includeAccidentals: boolean = false
): Note => {
  const range = practiceRange
    ? getPracticeMidiRange(clef, practiceRange)
    : clef === ClefType.TREBLE
      ? TREBLE_RANGE
      : BASS_RANGE;

  const midi = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

  if (!includeAccidentals) {
    // Prefer white keys for basic practice
    const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
    const whiteKeyMidi = isBlack ? midi - 1 : midi;
    return createNoteFromMidi(whiteKeyMidi, globalIdx);
  }

  // Include black keys - randomly choose sharp or flat representation
  const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
  const preferFlat = isBlack && Math.random() < 0.5;
  return createNoteFromMidi(midi, globalIdx, undefined, preferFlat);
};

export const createInitialQueue = (
  clef: ClefType,
  size: number = DEFAULT_QUEUE_SIZE,
  practiceRange?: PracticeRangeMode,
  includeAccidentals: boolean = false
): Note[] =>
  Array.from({ length: size }, (_, i) =>
    generateRandomNoteData(clef, i, practiceRange, includeAccidentals)
  );

export const createChallengeQueue = (
  challengeNotes: Note[],
  size: number = DEFAULT_QUEUE_SIZE
): Note[] => challengeNotes.slice(0, size);

type AdvanceQueueParams = {
  queue: Note[];
  clef: ClefType;
  challengeSequence: Note[];
  challengeIndex: number;
  practiceRange?: PracticeRangeMode;
  queueSize?: number;
  includeAccidentals?: boolean;
};

export const advanceQueue = ({
  queue,
  clef,
  challengeSequence,
  challengeIndex,
  practiceRange,
  queueSize = DEFAULT_QUEUE_SIZE,
  includeAccidentals = false,
}: AdvanceQueueParams) => {
  const [, ...rest] = queue;
  const lastNote = rest[rest.length - 1];
  const nextGlobalIndex = lastNote ? lastNote.globalIndex + 1 : 0;

  let nextNote: Note | null = null;

  if (challengeSequence.length > 0) {
    const nextSeqIndex = challengeIndex + queueSize;
    if (nextSeqIndex < challengeSequence.length) {
      nextNote = challengeSequence[nextSeqIndex];
    }
  } else {
    nextNote = generateRandomNoteData(clef, nextGlobalIndex, practiceRange, includeAccidentals);
  }

  return {
    nextQueue: nextNote ? [...rest, nextNote] : rest,
    nextChallengeIndex: challengeSequence.length > 0 ? challengeIndex + 1 : challengeIndex,
  };
};
