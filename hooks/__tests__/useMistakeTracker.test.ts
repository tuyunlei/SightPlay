import { describe, expect, it } from 'vitest';

import { createMistakeTracker } from '../useMistakeTracker';

describe('createMistakeTracker', () => {
  it('tracks mistakes in ring buffer of size 10', () => {
    const tracker = createMistakeTracker();
    for (let i = 0; i < 12; i++) {
      tracker.addMistake('C', 'D');
    }
    expect(tracker.getMistakes()).toHaveLength(10);
  });

  it('getTopConfusions returns sorted pairs', () => {
    const tracker = createMistakeTracker();
    tracker.addMistake('E', 'F');
    tracker.addMistake('E', 'F');
    tracker.addMistake('E', 'F');
    tracker.addMistake('C', 'D');

    const top = tracker.getTopConfusions();
    expect(top[0]).toEqual({ noteA: 'E', noteB: 'F', count: 3 });
    expect(top[1]).toEqual({ noteA: 'C', noteB: 'D', count: 1 });
  });

  it('getTopConfusions treats reversed pairs as same', () => {
    const tracker = createMistakeTracker();
    tracker.addMistake('E', 'F');
    tracker.addMistake('F', 'E');

    const top = tracker.getTopConfusions();
    expect(top[0].count).toBe(2);
  });

  it('getDifficultNotes returns notes with highest error rate', () => {
    const tracker = createMistakeTracker();
    tracker.addMistake('E', 'F');
    tracker.addMistake('E', 'G');
    tracker.addMistake('C', 'D');

    const difficult = tracker.getDifficultNotes();
    expect(difficult[0]).toEqual({ note: 'E', errorCount: 2 });
  });

  it('detectPatterns returns accidentals when >= 3 accidental mistakes', () => {
    const tracker = createMistakeTracker();
    tracker.addMistake('C#', 'C');
    tracker.addMistake('F#', 'F');
    tracker.addMistake('Bb', 'B');

    const pattern = tracker.detectPatterns();
    expect(pattern).toEqual({ kind: 'accidentals', count: 3 });
  });

  it('detectPatterns returns note-pair when same pair >= 2', () => {
    const tracker = createMistakeTracker();
    tracker.addMistake('E', 'F');
    tracker.addMistake('E', 'F');

    const pattern = tracker.detectPatterns();
    expect(pattern).toEqual({ kind: 'note-pair', noteA: 'E', noteB: 'F', count: 2 });
  });

  it('detectPatterns returns adjacent when >= 3 adjacent mistakes', () => {
    const tracker = createMistakeTracker();
    tracker.addMistake('C', 'D');
    tracker.addMistake('E', 'F');
    tracker.addMistake('A', 'B');

    const pattern = tracker.detectPatterns();
    expect(pattern).toEqual({ kind: 'adjacent', count: 3 });
  });

  it('detectPatterns returns null with insufficient data', () => {
    const tracker = createMistakeTracker();
    tracker.addMistake('C', 'G');
    expect(tracker.detectPatterns()).toBeNull();
  });

  it('clear empties the buffer', () => {
    const tracker = createMistakeTracker();
    tracker.addMistake('C', 'D');
    tracker.clear();
    expect(tracker.getMistakes()).toHaveLength(0);
  });
});
