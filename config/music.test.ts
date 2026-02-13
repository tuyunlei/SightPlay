import { describe, expect, it } from 'vitest';

import {
  DURATION_BEATS,
  FLAT_NOTE_NAMES,
  NUMBER_MAP,
  NUMBER_MAP_FLAT,
  NOTE_NAMES,
  SOLFEGE_MAP,
  SOLFEGE_MAP_FLAT,
  TIME_SIGNATURES,
  getNoteLabels,
} from './music';

describe('music config', () => {
  describe('DURATION_BEATS', () => {
    it('maps note durations to beat counts', () => {
      expect(DURATION_BEATS).toEqual({
        whole: 4,
        half: 2,
        quarter: 1,
        eighth: 0.5,
        sixteenth: 0.25,
      });
    });
  });

  describe('TIME_SIGNATURES', () => {
    it('provides common preset signatures', () => {
      expect(TIME_SIGNATURES).toEqual({
        '4/4': { beats: 4, beatUnit: 4 },
        '3/4': { beats: 3, beatUnit: 4 },
        '2/4': { beats: 2, beatUnit: 4 },
        '6/8': { beats: 6, beatUnit: 8 },
      });
    });
  });

  describe('FLAT_NOTE_NAMES', () => {
    it('has 12 notes', () => {
      expect(FLAT_NOTE_NAMES).toHaveLength(12);
    });

    it('uses flats instead of sharps for black keys', () => {
      expect(FLAT_NOTE_NAMES).toEqual([
        'C',
        'Db',
        'D',
        'Eb',
        'E',
        'F',
        'Gb',
        'G',
        'Ab',
        'A',
        'Bb',
        'B',
      ]);
    });

    it('has same naturals as NOTE_NAMES', () => {
      const naturalsSharp = NOTE_NAMES.filter((n) => !n.includes('#'));
      const naturalsFlat = FLAT_NOTE_NAMES.filter((n) => !n.includes('b'));
      expect(naturalsSharp).toEqual(naturalsFlat);
    });
  });

  describe('getNoteLabels', () => {
    it('returns solfege and number for C', () => {
      expect(getNoteLabels('C')).toEqual({ solfege: 'Do', number: '1' });
    });

    it('returns solfege and number for sharps', () => {
      expect(getNoteLabels('F#')).toEqual({ solfege: 'Fa♯', number: '4♯' });
    });

    it('returns solfege and number for flats', () => {
      expect(getNoteLabels('Db')).toEqual({ solfege: 'Re♭', number: '2♭' });
      expect(getNoteLabels('Eb')).toEqual({ solfege: 'Mi♭', number: '3♭' });
      expect(getNoteLabels('Gb')).toEqual({ solfege: 'Sol♭', number: '5♭' });
      expect(getNoteLabels('Ab')).toEqual({ solfege: 'La♭', number: '6♭' });
      expect(getNoteLabels('Bb')).toEqual({ solfege: 'Si♭', number: '7♭' });
    });

    it('returns solfege and number for B (last note)', () => {
      expect(getNoteLabels('B')).toEqual({ solfege: 'Si', number: '7' });
    });

    it('returns empty strings for invalid note name', () => {
      // Cast to bypass TS - testing runtime defense
      expect(getNoteLabels('X' as any)).toEqual({ solfege: '', number: '' });
    });

    it('maps all 12 sharp notes correctly', () => {
      for (let i = 0; i < NOTE_NAMES.length; i++) {
        const labels = getNoteLabels(NOTE_NAMES[i]);
        expect(labels.solfege).toBe(SOLFEGE_MAP[i]);
        expect(labels.number).toBe(NUMBER_MAP[i]);
      }
    });

    it('maps all 12 flat notes correctly', () => {
      for (let i = 0; i < FLAT_NOTE_NAMES.length; i++) {
        const labels = getNoteLabels(FLAT_NOTE_NAMES[i]);
        expect(labels.solfege).toBe(SOLFEGE_MAP_FLAT[i]);
        expect(labels.number).toBe(NUMBER_MAP_FLAT[i]);
      }
    });
  });
});
