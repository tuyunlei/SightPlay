import { BASS_RANGE, TREBLE_RANGE } from '../config/music';
import { getPracticeMidiRange } from '../config/practice';
import { ClefType, HandPracticeMode, Note, PracticeRangeMode } from '../types';

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

/**
 * Generate notes for both hands at a given position
 * Returns [rightHandNote, leftHandNote]
 */
export const generateBothHandsNotes = (
  globalIdx: number,
  includeAccidentals: boolean = false
): [Note, Note] => {
  const rightHand = generateRandomNoteData(
    ClefType.TREBLE,
    globalIdx,
    undefined,
    includeAccidentals
  );
  const leftHand = generateRandomNoteData(ClefType.BASS, globalIdx, undefined, includeAccidentals);
  return [rightHand, leftHand];
};

export const createInitialQueue = (
  clef: ClefType,
  size: number = DEFAULT_QUEUE_SIZE,
  practiceRange?: PracticeRangeMode,
  includeAccidentals: boolean = false,
  handMode: HandPracticeMode = 'right-hand'
): Note[] => {
  if (handMode === 'both-hands') {
    // For both-hands mode, generate pairs of notes (right + left) for each position
    const notes: Note[] = [];
    for (let i = 0; i < size; i++) {
      const [rightHand, leftHand] = generateBothHandsNotes(i, includeAccidentals);
      notes.push(rightHand, leftHand);
    }
    return notes;
  }

  // For single-hand modes, use the appropriate clef
  // Note: practiceRange is ignored for explicit hand modes (right/left)
  // to ensure notes stay in the correct clef range
  if (handMode === 'right-hand') {
    return Array.from({ length: size }, (_, i) =>
      generateRandomNoteData(ClefType.TREBLE, i, undefined, includeAccidentals)
    );
  }

  if (handMode === 'left-hand') {
    return Array.from({ length: size }, (_, i) =>
      generateRandomNoteData(ClefType.BASS, i, undefined, includeAccidentals)
    );
  }

  // Default case (shouldn't normally be reached with proper handMode)
  return Array.from({ length: size }, (_, i) =>
    generateRandomNoteData(clef, i, practiceRange, includeAccidentals)
  );
};

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
  handMode?: HandPracticeMode;
};

export const advanceQueue = ({
  queue,
  clef,
  challengeSequence,
  challengeIndex,
  practiceRange,
  queueSize = DEFAULT_QUEUE_SIZE,
  includeAccidentals = false,
  handMode = 'right-hand',
}: AdvanceQueueParams) => {
  if (handMode === 'both-hands') {
    // For both-hands mode, remove the first two notes (right + left pair)
    const [, , ...rest] = queue;
    const lastNote = rest[rest.length - 1];
    const nextGlobalIndex = lastNote ? lastNote.globalIndex + 1 : 0;

    let nextNotes: Note[] = [];

    if (challengeSequence.length > 0) {
      // Challenge mode for both hands not implemented yet
      // Fall back to normal behavior
    } else {
      const [rightHand, leftHand] = generateBothHandsNotes(nextGlobalIndex, includeAccidentals);
      nextNotes = [rightHand, leftHand];
    }

    return {
      nextQueue: nextNotes.length > 0 ? [...rest, ...nextNotes] : rest,
      nextChallengeIndex: challengeSequence.length > 0 ? challengeIndex + 1 : challengeIndex,
    };
  }

  // Single-hand mode
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
    // For explicit hand modes, ignore practiceRange to ensure correct clef range
    if (handMode === 'right-hand') {
      nextNote = generateRandomNoteData(
        ClefType.TREBLE,
        nextGlobalIndex,
        undefined,
        includeAccidentals
      );
    } else if (handMode === 'left-hand') {
      nextNote = generateRandomNoteData(
        ClefType.BASS,
        nextGlobalIndex,
        undefined,
        includeAccidentals
      );
    } else {
      // Fallback for other cases
      nextNote = generateRandomNoteData(clef, nextGlobalIndex, practiceRange, includeAccidentals);
    }
  }

  return {
    nextQueue: nextNote ? [...rest, nextNote] : rest,
    nextChallengeIndex: challengeSequence.length > 0 ? challengeIndex + 1 : challengeIndex,
  };
};
