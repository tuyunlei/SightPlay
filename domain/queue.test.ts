import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClefType, Note } from '../types';

import { createNoteFromMidi } from './note';
import { advanceQueue, createInitialQueue, generateRandomNoteData } from './queue';

describe('queue', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid',
    });
  });

  it('creates initial queue with expected size', () => {
    const queue = createInitialQueue(ClefType.TREBLE, 5);
    expect(queue).toHaveLength(5);
  });

  it('creates initial queue without accidentals by default', () => {
    const queue = createInitialQueue(ClefType.TREBLE, 20);
    const hasAccidentals = queue.some((note) => note.name.includes('#') || note.name.includes('b'));
    expect(hasAccidentals).toBe(false);
  });

  it('creates initial queue with accidentals when includeAccidentals is true', () => {
    // Use a larger sample size to ensure we hit black keys
    const queue = createInitialQueue(ClefType.TREBLE, 100, undefined, true);
    const hasAccidentals = queue.some((note) => note.name.includes('#') || note.name.includes('b'));
    // With 100 notes and 5/12 being black keys, we should definitely have some accidentals
    expect(hasAccidentals).toBe(true);
  });

  it('advances challenge queue using next sequence note', () => {
    const sequence: Note[] = [
      createNoteFromMidi(60, 0),
      createNoteFromMidi(62, 1),
      createNoteFromMidi(64, 2),
    ];
    const queue = sequence.slice(0, 2);

    const { nextQueue, nextChallengeIndex } = advanceQueue({
      queue,
      clef: ClefType.TREBLE,
      challengeSequence: sequence,
      challengeIndex: 0,
      queueSize: 2,
    });

    expect(nextChallengeIndex).toBe(1);
    expect(nextQueue).toHaveLength(2);
    expect(nextQueue[1].midi).toBe(64);
  });

  it('generateRandomNoteData produces only white keys by default', () => {
    const notes = Array.from({ length: 50 }, (_, i) => generateRandomNoteData(ClefType.TREBLE, i));
    const hasAccidentals = notes.some((note) => note.name.includes('#') || note.name.includes('b'));
    expect(hasAccidentals).toBe(false);
  });

  it('generateRandomNoteData can produce black keys with includeAccidentals', () => {
    const notes = Array.from({ length: 100 }, (_, i) =>
      generateRandomNoteData(ClefType.TREBLE, i, undefined, true)
    );
    const hasAccidentals = notes.some((note) => note.name.includes('#') || note.name.includes('b'));
    expect(hasAccidentals).toBe(true);
  });

  it('generateRandomNoteData produces both sharps and flats when includeAccidentals is true', () => {
    // Generate enough notes to statistically get both
    const notes = Array.from({ length: 200 }, (_, i) =>
      generateRandomNoteData(ClefType.TREBLE, i, undefined, true)
    );
    const hasSharps = notes.some((note) => note.name.includes('#'));
    const hasFlats = notes.some((note) => note.name.includes('b'));

    // With 200 notes and random selection, we should have both
    expect(hasSharps).toBe(true);
    expect(hasFlats).toBe(true);
  });
});
