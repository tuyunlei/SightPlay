import { describe, expect, it } from 'vitest';

import { getNoteLabels, NOTE_NAMES, SOLFEGE_MAP, NUMBER_MAP } from './music';

describe('music config', () => {
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
