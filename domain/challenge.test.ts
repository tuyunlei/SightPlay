import { describe, expect, it } from 'vitest';
import { buildChallengeNotes, shouldCompleteChallenge } from './challenge';

describe('challenge', () => {
  it('builds challenge notes and filters invalid entries', () => {
    const notes = buildChallengeNotes(['C4', 'D#4', 'H2']);
    expect(notes).toHaveLength(2);
    expect(notes[0].midi).toBe(60);
  });

  it('detects challenge completion when queue exhausted', () => {
    expect(shouldCompleteChallenge(1, 3)).toBe(true);
    expect(shouldCompleteChallenge(2, 3)).toBe(false);
    expect(shouldCompleteChallenge(1, 0)).toBe(false);
  });
});
