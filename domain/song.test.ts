import { describe, it, expect } from 'vitest';

import { Song } from '../data/songs';
import { ClefType } from '../types';

import { createNoteFromMidi } from './note';
import {
  loadSongToQueue,
  calculateSongProgress,
  calculateSongAccuracy,
  formatSongTime,
} from './song';

const createTestSong = (): Song => ({
  id: 'test-song',
  title: 'Test Song',
  difficulty: 'beginner',
  category: 'exercise',
  clef: ClefType.TREBLE,
  timeSignature: { beats: 4, beatUnit: 4 },
  notes: [
    createNoteFromMidi(60, 0, 'quarter'), // C4
    createNoteFromMidi(62, 1, 'quarter'), // D4
    createNoteFromMidi(64, 2, 'quarter'), // E4
    createNoteFromMidi(65, 3, 'quarter'), // F4
    createNoteFromMidi(67, 4, 'quarter'), // G4
  ],
});

describe('loadSongToQueue', () => {
  it('should load first queueSize notes from song', () => {
    const song = createTestSong();
    const queue = loadSongToQueue(song, 3);

    expect(queue).toHaveLength(3);
    expect(queue[0].midi).toBe(60);
    expect(queue[1].midi).toBe(62);
    expect(queue[2].midi).toBe(64);
  });

  it('should load all notes if song is shorter than queueSize', () => {
    const song = createTestSong();
    const queue = loadSongToQueue(song, 10);

    expect(queue).toHaveLength(5); // Song only has 5 notes
  });

  it('should default to queueSize 20', () => {
    const song: Song = {
      ...createTestSong(),
      notes: Array.from({ length: 25 }, (_, i) => createNoteFromMidi(60 + i, i, 'quarter')),
    };
    const queue = loadSongToQueue(song);

    expect(queue).toHaveLength(20);
  });
});

describe('calculateSongProgress', () => {
  it('should calculate correct progress percentage', () => {
    expect(calculateSongProgress(0, 10)).toBe(0);
    expect(calculateSongProgress(5, 10)).toBe(50);
    expect(calculateSongProgress(10, 10)).toBe(100);
  });

  it('should handle edge cases', () => {
    expect(calculateSongProgress(0, 0)).toBe(0);
    expect(calculateSongProgress(3, 7)).toBe(43); // Rounded
  });
});

describe('calculateSongAccuracy', () => {
  it('should calculate correct accuracy percentage', () => {
    expect(calculateSongAccuracy(10, 10)).toBe(100);
    expect(calculateSongAccuracy(5, 10)).toBe(50);
    expect(calculateSongAccuracy(7, 10)).toBe(70);
  });

  it('should handle edge cases', () => {
    expect(calculateSongAccuracy(0, 0)).toBe(0);
    expect(calculateSongAccuracy(0, 10)).toBe(0);
  });

  it('should round to nearest integer', () => {
    expect(calculateSongAccuracy(1, 3)).toBe(33);
    expect(calculateSongAccuracy(2, 3)).toBe(67);
  });
});

describe('formatSongTime', () => {
  it('should format time correctly', () => {
    const now = Date.now();

    expect(formatSongTime(null)).toBe('0:00');
    expect(formatSongTime(now)).toBe('0:00');
    expect(formatSongTime(now - 30000)).toBe('0:30'); // 30 seconds ago
    expect(formatSongTime(now - 65000)).toBe('1:05'); // 65 seconds ago
    expect(formatSongTime(now - 125000)).toBe('2:05'); // 125 seconds ago
  });

  it('should pad seconds with zero', () => {
    const now = Date.now();
    expect(formatSongTime(now - 5000)).toBe('0:05');
    expect(formatSongTime(now - 605000)).toBe('10:05');
  });
});
