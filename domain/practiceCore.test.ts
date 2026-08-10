import { describe, expect, it } from 'vitest';

import { createNoteFromMidi } from './note';
import { initialPracticeState, PracticeState, reducePractice } from './practiceCore';

const note = (midi: number, globalIndex = 0) => createNoteFromMidi(midi, globalIndex);
const stateWith = (partial: Partial<PracticeState>): PracticeState => ({
  ...initialPracticeState,
  ...partial,
});

describe('reducePractice', () => {
  it('accepts a clean note as one atomic score, queue, stats, and animation transition', () => {
    const first = note(60, 0);
    const second = note(62, 1);
    const replacement = note(64, 2);

    const result = reducePractice(stateWith({ noteQueue: [first, second], score: 20, streak: 2 }), {
      type: 'correctNoteAccepted',
      acceptedAt: 2_000,
      previousHitAt: 1_000,
      hadMistake: false,
      nextQueue: [second, replacement],
      nextChallengeIndex: 0,
    });

    expect(result.state).toMatchObject({
      noteQueue: [second, replacement],
      exitingNotes: [first],
      score: 34,
      streak: 3,
      sessionStats: { totalAttempts: 1, cleanHits: 1, bpm: 60 },
    });
    expect(result.effects).toEqual([
      { type: 'scheduleExitCleanup', noteId: first.id, delayMs: 600 },
    ]);
  });

  it('records an attempt but not a clean hit after a mistake', () => {
    const target = note(60);
    const result = reducePractice(stateWith({ noteQueue: [target] }), {
      type: 'correctNoteAccepted',
      acceptedAt: 1_000,
      previousHitAt: 0,
      hadMistake: true,
      nextQueue: [],
      nextChallengeIndex: 0,
    });

    expect(result.state.sessionStats).toMatchObject({ totalAttempts: 1, cleanHits: 0 });
  });

  it('moves both target notes into the exit animation in both-hands mode', () => {
    const right = note(60, 0);
    const left = note(48, 1);
    const result = reducePractice(stateWith({ handMode: 'both-hands', noteQueue: [right, left] }), {
      type: 'correctNoteAccepted',
      acceptedAt: 1_000,
      previousHitAt: 0,
      hadMistake: false,
      nextQueue: [],
      nextChallengeIndex: 0,
    });

    expect(result.state.exitingNotes).toEqual([right, left]);
    expect(result.effects).toEqual([
      { type: 'scheduleExitCleanup', noteId: right.id, delayMs: 600 },
      { type: 'scheduleExitCleanup', noteId: left.id, delayMs: 600 },
    ]);
  });

  it('emits challenge completion without performing the delayed reset early', () => {
    const target = note(60);
    const challenge = [target, note(62, 1)];
    const result = reducePractice(
      stateWith({ noteQueue: [target], challengeSequence: challenge, challengeIndex: 1 }),
      {
        type: 'correctNoteAccepted',
        acceptedAt: 1_000,
        previousHitAt: 0,
        hadMistake: false,
        nextQueue: [],
        nextChallengeIndex: 2,
      }
    );

    expect(result.state.challengeSequence).toEqual(challenge);
    expect(result.state.challengeIndex).toBe(2);
    expect(result.effects).toContainEqual({
      type: 'completeChallenge',
      delayMs: 1500,
      clef: initialPracticeState.clef,
      practiceRange: initialPracticeState.practiceRange,
      handMode: initialPracticeState.handMode,
    });
  });

  it('applies delayed animation cleanup and challenge reset actions', () => {
    const exiting = note(60);
    const retained = note(62);
    const cleanup = reducePractice(stateWith({ exitingNotes: [exiting, retained] }), {
      type: 'exitAnimationElapsed',
      noteId: exiting.id,
    });
    expect(cleanup.state.exitingNotes).toEqual([retained]);

    const randomQueue = [note(65)];
    const reset = reducePractice(
      stateWith({
        challengeSequence: [exiting],
        challengeIndex: 1,
        challengeInfo: { title: 'Challenge', notes: ['C4'], description: 'test' },
      }),
      { type: 'challengeResetElapsed', noteQueue: randomQueue }
    );
    expect(reset.state).toMatchObject({
      challengeSequence: [],
      challengeIndex: 0,
      challengeInfo: null,
      noteQueue: randomQueue,
    });
  });

  it('loads challenge state and resets session statistics atomically', () => {
    const challenge = { title: 'Scale', notes: ['C4'], description: 'test' };
    const sequence = [note(60)];
    const result = reducePractice(
      stateWith({
        score: 90,
        streak: 8,
        sessionStats: { totalAttempts: 9, cleanHits: 8, bpm: 90 },
      }),
      { type: 'challengeLoaded', challenge, challengeSequence: sequence, noteQueue: sequence }
    );

    expect(result.state).toMatchObject({
      challengeInfo: challenge,
      challengeSequence: sequence,
      challengeIndex: 0,
      noteQueue: sequence,
      score: 0,
      streak: 0,
      sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
    });
  });
});
