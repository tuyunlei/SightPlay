import { BASS_RANGE, TREBLE_RANGE } from '../config/music';
import { getPracticeMidiRange } from '../config/practice';
import { ClefType, Note, PracticeRangeMode } from '../types';

import { createNoteFromMidi } from './note';

export const DEFAULT_QUEUE_SIZE = 20;

export const generateRandomNoteData = (
  clef: ClefType,
  globalIdx: number,
  practiceRange?: PracticeRangeMode
): Note => {
  const range = practiceRange
    ? getPracticeMidiRange(clef, practiceRange)
    : clef === ClefType.TREBLE
      ? TREBLE_RANGE
      : BASS_RANGE;

  // Prefer white keys for basic practice
  const whiteKeyMidi = (() => {
    const m = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    const isBlack = [1, 3, 6, 8, 10].includes(m % 12);
    return isBlack ? m - 1 : m;
  })();

  return createNoteFromMidi(whiteKeyMidi, globalIdx);
};

export const createInitialQueue = (
  clef: ClefType,
  size: number = DEFAULT_QUEUE_SIZE,
  practiceRange?: PracticeRangeMode
): Note[] => Array.from({ length: size }, (_, i) => generateRandomNoteData(clef, i, practiceRange));

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
};

export const advanceQueue = ({
  queue,
  clef,
  challengeSequence,
  challengeIndex,
  practiceRange,
  queueSize = DEFAULT_QUEUE_SIZE,
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
    nextNote = generateRandomNoteData(clef, nextGlobalIndex, practiceRange);
  }

  return {
    nextQueue: nextNote ? [...rest, nextNote] : rest,
    nextChallengeIndex: challengeSequence.length > 0 ? challengeIndex + 1 : challengeIndex,
  };
};
