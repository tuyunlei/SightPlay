import { describe, it, expect } from 'vitest';

import { ClefType, PracticeRangeMode } from '../types';

import { getPracticeMidiRange } from './practice';

// CLEF_CENTER_MIDI: treble=71(B4), bass=50(D3)
// Octave containing B4(71): floor(71/12)*12=60, so range 60-71
// Octave containing D3(50): floor(50/12)*12=48, so range 48-59

describe('getPracticeMidiRange', () => {
  describe('treble clef (center=71, octave 60-71)', () => {
    it('central mode returns the center octave', () => {
      const range = getPracticeMidiRange(ClefType.TREBLE, 'central');
      expect(range).toEqual({ min: 60, max: 71 });
    });

    it('upper mode returns one octave above center', () => {
      const range = getPracticeMidiRange(ClefType.TREBLE, 'upper');
      expect(range).toEqual({ min: 72, max: 83 });
    });

    it('combined mode spans both octaves', () => {
      const range = getPracticeMidiRange(ClefType.TREBLE, 'combined');
      expect(range).toEqual({ min: 60, max: 83 });
    });
  });

  describe('bass clef (center=50, octave 48-59)', () => {
    it('central mode returns the center octave', () => {
      const range = getPracticeMidiRange(ClefType.BASS, 'central');
      expect(range).toEqual({ min: 48, max: 59 });
    });

    it('upper mode returns one octave above center', () => {
      const range = getPracticeMidiRange(ClefType.BASS, 'upper');
      expect(range).toEqual({ min: 60, max: 71 });
    });

    it('combined mode spans both octaves', () => {
      const range = getPracticeMidiRange(ClefType.BASS, 'combined');
      expect(range).toEqual({ min: 48, max: 71 });
    });
  });

  it('all modes return min < max', () => {
    const modes: PracticeRangeMode[] = ['central', 'upper', 'combined'];
    const clefs = [ClefType.TREBLE, ClefType.BASS];

    for (const clef of clefs) {
      for (const mode of modes) {
        const range = getPracticeMidiRange(clef, mode);
        expect(range.min).toBeLessThan(range.max);
      }
    }
  });

  it('combined range equals central.min to upper.max', () => {
    for (const clef of [ClefType.TREBLE, ClefType.BASS]) {
      const central = getPracticeMidiRange(clef, 'central');
      const upper = getPracticeMidiRange(clef, 'upper');
      const combined = getPracticeMidiRange(clef, 'combined');
      expect(combined.min).toBe(central.min);
      expect(combined.max).toBe(upper.max);
    }
  });
});
