import { describe, expect, it } from 'vitest';
import { ClefType, Note } from '../types';
import { createNoteFromMidi } from './note';
import { advanceQueue, createInitialQueue } from './queue';

describe('queue', () => {
  it('creates initial queue with expected size', () => {
    const queue = createInitialQueue(ClefType.TREBLE, 5);
    expect(queue).toHaveLength(5);
  });

  it('advances challenge queue using next sequence note', () => {
    const sequence: Note[] = [
      createNoteFromMidi(60, 0),
      createNoteFromMidi(62, 1),
      createNoteFromMidi(64, 2)
    ];
    const queue = sequence.slice(0, 2);

    const { nextQueue, nextChallengeIndex } = advanceQueue({
      queue,
      clef: ClefType.TREBLE,
      challengeSequence: sequence,
      challengeIndex: 0,
      queueSize: 2
    });

    expect(nextChallengeIndex).toBe(1);
    expect(nextQueue).toHaveLength(2);
    expect(nextQueue[1].midi).toBe(64);
  });
});
