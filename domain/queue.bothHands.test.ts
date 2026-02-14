import { describe, expect, it } from 'vitest';

import { ClefType } from '../types';

import {
  generateBothHandsNotes,
  createInitialQueue,
  advanceQueue,
  DEFAULT_QUEUE_SIZE,
} from './queue';

describe('Both Hands Queue Generation', () => {
  describe('generateBothHandsNotes', () => {
    it('generates two notes with same globalIndex', () => {
      const [rightHand, leftHand] = generateBothHandsNotes(0);

      expect(rightHand.globalIndex).toBe(0);
      expect(leftHand.globalIndex).toBe(0);
      expect(rightHand.id).not.toBe(leftHand.id); // Different IDs
    });

    it('generates right hand note in treble range (>= 60)', () => {
      const [rightHand] = generateBothHandsNotes(0);
      expect(rightHand.midi).toBeGreaterThanOrEqual(60); // C4 or higher
    });

    it('generates left hand note in bass range (<= 60)', () => {
      const [, leftHand] = generateBothHandsNotes(0);
      expect(leftHand.midi).toBeLessThanOrEqual(60); // C4 or below
      expect(leftHand.midi).toBeGreaterThanOrEqual(40); // E2 or above
    });
  });

  describe('createInitialQueue with both-hands mode', () => {
    it('creates queue with double the notes (pairs)', () => {
      const queue = createInitialQueue(
        ClefType.TREBLE,
        DEFAULT_QUEUE_SIZE,
        'combined',
        false,
        'both-hands'
      );

      // For both-hands mode, we generate pairs, so queue length = size * 2
      expect(queue.length).toBe(DEFAULT_QUEUE_SIZE * 2);
    });

    it('alternates between right and left hand notes', () => {
      const queue = createInitialQueue(ClefType.TREBLE, 3, 'combined', false, 'both-hands');

      // Should have 6 notes total
      expect(queue.length).toBe(6);

      // Check that notes are in correct ranges (treble vs bass)
      // Right hand: treble range (60-79)
      expect(queue[0].midi).toBeGreaterThanOrEqual(60);
      expect(queue[0].midi).toBeLessThanOrEqual(79);
      // Left hand: bass range (40-60)
      expect(queue[1].midi).toBeGreaterThanOrEqual(40);
      expect(queue[1].midi).toBeLessThanOrEqual(60);
    });

    it('all pairs share same globalIndex', () => {
      const queue = createInitialQueue(ClefType.TREBLE, 3, 'combined', false, 'both-hands');

      expect(queue[0].globalIndex).toBe(0);
      expect(queue[1].globalIndex).toBe(0);
      expect(queue[2].globalIndex).toBe(1);
      expect(queue[3].globalIndex).toBe(1);
      expect(queue[4].globalIndex).toBe(2);
      expect(queue[5].globalIndex).toBe(2);
    });
  });

  describe('createInitialQueue with single-hand modes', () => {
    it('creates treble notes for right-hand mode', () => {
      const queue = createInitialQueue(
        ClefType.BASS, // This should be ignored
        DEFAULT_QUEUE_SIZE,
        'combined',
        false,
        'right-hand'
      );

      expect(queue.length).toBe(DEFAULT_QUEUE_SIZE);
      // All notes should be in treble range
      queue.forEach((note) => {
        expect(note.midi).toBeGreaterThanOrEqual(60);
      });
    });

    it('creates bass notes for left-hand mode', () => {
      const queue = createInitialQueue(
        ClefType.TREBLE, // This should be ignored
        DEFAULT_QUEUE_SIZE,
        'combined',
        false,
        'left-hand'
      );

      expect(queue.length).toBe(DEFAULT_QUEUE_SIZE);
      // All notes should be in bass range (40-60 inclusive)
      queue.forEach((note) => {
        expect(note.midi).toBeLessThanOrEqual(60);
        expect(note.midi).toBeGreaterThanOrEqual(40);
      });
    });
  });

  describe('advanceQueue with both-hands mode', () => {
    it('removes two notes (a pair) and adds two new notes', () => {
      const initialQueue = createInitialQueue(ClefType.TREBLE, 5, 'combined', false, 'both-hands');
      const initialLength = initialQueue.length; // Should be 10

      const { nextQueue } = advanceQueue({
        queue: initialQueue,
        clef: ClefType.TREBLE,
        challengeSequence: [],
        challengeIndex: 0,
        practiceRange: 'combined',
        handMode: 'both-hands',
      });

      // Should remove first 2 notes and add 2 new notes
      expect(nextQueue.length).toBe(initialLength);

      // First two notes should be different from original
      expect(nextQueue[0].id).not.toBe(initialQueue[0].id);
      expect(nextQueue[1].id).not.toBe(initialQueue[1].id);
    });

    it('maintains right/left pattern after advance', () => {
      const initialQueue = createInitialQueue(ClefType.TREBLE, 3, 'combined', false, 'both-hands');

      const { nextQueue } = advanceQueue({
        queue: initialQueue,
        clef: ClefType.TREBLE,
        challengeSequence: [],
        challengeIndex: 0,
        practiceRange: 'combined',
        handMode: 'both-hands',
      });

      // After removing first pair, pattern should still hold
      // Check ranges instead of strict inequality
      expect(nextQueue[0].midi).toBeGreaterThanOrEqual(60); // Right (treble)
      expect(nextQueue[0].midi).toBeLessThanOrEqual(79);
      expect(nextQueue[1].midi).toBeGreaterThanOrEqual(40); // Left (bass)
      expect(nextQueue[1].midi).toBeLessThanOrEqual(60);
    });
  });

  describe('advanceQueue with single-hand modes', () => {
    it('removes one note for right-hand mode', () => {
      const initialQueue = createInitialQueue(ClefType.TREBLE, 5, 'combined', false, 'right-hand');

      const { nextQueue } = advanceQueue({
        queue: initialQueue,
        clef: ClefType.TREBLE,
        challengeSequence: [],
        challengeIndex: 0,
        practiceRange: 'combined',
        handMode: 'right-hand',
      });

      expect(nextQueue.length).toBe(5); // Same length (remove 1, add 1)
      expect(nextQueue[0].id).toBe(initialQueue[1].id); // First note removed
    });
  });
});
