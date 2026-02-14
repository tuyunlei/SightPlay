import { describe, it, expect } from 'vitest';

import { ClefType } from '../../types';

import { SONG_LIBRARY, getSongById, getSongsByDifficulty, getSongsByCategory } from './library';

describe('Song Library', () => {
  describe('SONG_LIBRARY', () => {
    it('should contain at least 5 songs', () => {
      expect(SONG_LIBRARY.length).toBeGreaterThanOrEqual(5);
    });

    it('should have all required fields for each song', () => {
      SONG_LIBRARY.forEach((song) => {
        expect(song).toHaveProperty('id');
        expect(song).toHaveProperty('title');
        expect(song).toHaveProperty('difficulty');
        expect(song).toHaveProperty('category');
        expect(song).toHaveProperty('clef');
        expect(song).toHaveProperty('timeSignature');
        expect(song).toHaveProperty('notes');

        expect(typeof song.id).toBe('string');
        expect(typeof song.title).toBe('string');
        expect(['beginner', 'intermediate', 'advanced']).toContain(song.difficulty);
        expect(['classical', 'folk', 'exercise']).toContain(song.category);
        expect([ClefType.TREBLE, ClefType.BASS]).toContain(song.clef);
        expect(song.timeSignature).toHaveProperty('beats');
        expect(song.timeSignature).toHaveProperty('beatUnit');
        expect(Array.isArray(song.notes)).toBe(true);
        expect(song.notes.length).toBeGreaterThan(0);
      });
    });

    it('should have unique song IDs', () => {
      const ids = SONG_LIBRARY.map((song) => song.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid notes with duration', () => {
      SONG_LIBRARY.forEach((song) => {
        song.notes.forEach((note) => {
          expect(note).toHaveProperty('id');
          expect(note).toHaveProperty('name');
          expect(note).toHaveProperty('octave');
          expect(note).toHaveProperty('midi');
          expect(note).toHaveProperty('frequency');
          expect(note).toHaveProperty('globalIndex');
          expect(note).toHaveProperty('duration');

          expect(['whole', 'half', 'quarter', 'eighth', 'sixteenth']).toContain(note.duration);
          expect(typeof note.midi).toBe('number');
          expect(note.midi).toBeGreaterThanOrEqual(21); // A0
          expect(note.midi).toBeLessThanOrEqual(108); // C8
        });
      });
    });

    it('should cover all difficulty levels', () => {
      const difficulties = SONG_LIBRARY.map((song) => song.difficulty);
      expect(difficulties).toContain('beginner');
      expect(difficulties).toContain('intermediate');
      expect(difficulties).toContain('advanced');
    });

    it('should cover all categories', () => {
      const categories = SONG_LIBRARY.map((song) => song.category);
      expect(categories).toContain('classical');
      expect(categories).toContain('folk');
      expect(categories).toContain('exercise');
    });
  });

  describe('getSongById', () => {
    it('should return song by ID', () => {
      const song = getSongById('twinkle-twinkle');
      expect(song).toBeDefined();
      expect(song?.id).toBe('twinkle-twinkle');
      expect(song?.title).toBe('Twinkle Twinkle Little Star');
    });

    it('should return undefined for non-existent ID', () => {
      const song = getSongById('non-existent-song');
      expect(song).toBeUndefined();
    });
  });

  describe('getSongsByDifficulty', () => {
    it('should return all beginner songs', () => {
      const songs = getSongsByDifficulty('beginner');
      expect(songs.length).toBeGreaterThan(0);
      songs.forEach((song) => {
        expect(song.difficulty).toBe('beginner');
      });
    });

    it('should return all intermediate songs', () => {
      const songs = getSongsByDifficulty('intermediate');
      expect(songs.length).toBeGreaterThan(0);
      songs.forEach((song) => {
        expect(song.difficulty).toBe('intermediate');
      });
    });

    it('should return all advanced songs', () => {
      const songs = getSongsByDifficulty('advanced');
      expect(songs.length).toBeGreaterThan(0);
      songs.forEach((song) => {
        expect(song.difficulty).toBe('advanced');
      });
    });

    it('should return empty array for invalid difficulty', () => {
      const songs = getSongsByDifficulty('invalid');
      expect(songs).toEqual([]);
    });
  });

  describe('getSongsByCategory', () => {
    it('should return all classical songs', () => {
      const songs = getSongsByCategory('classical');
      expect(songs.length).toBeGreaterThan(0);
      songs.forEach((song) => {
        expect(song.category).toBe('classical');
      });
    });

    it('should return all folk songs', () => {
      const songs = getSongsByCategory('folk');
      expect(songs.length).toBeGreaterThan(0);
      songs.forEach((song) => {
        expect(song.category).toBe('folk');
      });
    });

    it('should return all exercise songs', () => {
      const songs = getSongsByCategory('exercise');
      expect(songs.length).toBeGreaterThan(0);
      songs.forEach((song) => {
        expect(song.category).toBe('exercise');
      });
    });

    it('should return empty array for invalid category', () => {
      const songs = getSongsByCategory('invalid');
      expect(songs).toEqual([]);
    });
  });
});
