import { describe, expect, it } from 'vitest';

import {
  DURATION_BEATS,
  TIME_SIGNATURES,
  getNoteLabels,
  NOTE_NAMES,
  SOLFEGE_MAP,
  NUMBER_MAP,
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

  describe('getNoteLabels', () => {
    it('returns solfege and number for C', () => {
      expect(getNoteLabels('C')).toEqual({ solfege: 'Do', number: '1' });
    });

    it('returns solfege and number for sharps', () => {
      expect(getNoteLabels('F#')).toEqual({ solfege: 'Fa♯', number: '4♯' });
    });

    it('returns solfege and number for B (last note)', () => {
      expect(getNoteLabels('B')).toEqual({ solfege: 'Si', number: '7' });
    });

    it('returns empty strings for invalid note name', () => {
      // Cast to bypass TS - testing runtime defense
      expect(getNoteLabels('X' as any)).toEqual({ solfege: '', number: '' });
    });

    it('maps all 12 notes correctly', () => {
      for (let i = 0; i < NOTE_NAMES.length; i++) {
        const labels = getNoteLabels(NOTE_NAMES[i]);
        expect(labels.solfege).toBe(SOLFEGE_MAP[i]);
        expect(labels.number).toBe(NUMBER_MAP[i]);
      }
    });
  });
});
