import { describe, expect, it } from 'vitest';

import { ClefType, PracticeRangeMode } from '../types';

import { CLEF_CENTER_MIDI } from './music';
import { getPracticeMidiRange } from './practice';

describe('practice', () => {
  describe('getPracticeMidiRange', () => {
    // Piano range: MIDI 21 (A0) to 108 (C8)
    const PIANO_MIN = 21;
    const PIANO_MAX = 108;

    describe('treble clef', () => {
      const clef = ClefType.TREBLE;
      const centerMidi = CLEF_CENTER_MIDI[clef]; // 71 (B4)

      it('should return central octave range for central mode', () => {
        const range = getPracticeMidiRange(clef, 'central');

        // Central range should be the octave containing the center note
        expect(range.min).toBeLessThanOrEqual(centerMidi);
        expect(range.max).toBeGreaterThanOrEqual(centerMidi);
        expect(range.max - range.min).toBe(11); // One octave = 12 semitones - 1
      });

      it('should return upper octave range for upper mode', () => {
        const range = getPracticeMidiRange(clef, 'upper');
        const centralRange = getPracticeMidiRange(clef, 'central');

        // Upper range should be one octave above central
        expect(range.min).toBe(centralRange.min + 12);
        expect(range.max).toBe(centralRange.max + 12);
        expect(range.max - range.min).toBe(11);
      });

      it('should return combined range for combined mode', () => {
        const range = getPracticeMidiRange(clef, 'combined');
        const centralRange = getPracticeMidiRange(clef, 'central');
        const upperRange = getPracticeMidiRange(clef, 'upper');

        // Combined should span from central min to upper max
        expect(range.min).toBe(centralRange.min);
        expect(range.max).toBe(upperRange.max);
        expect(range.max - range.min).toBe(23); // Two octaves = 24 semitones - 1
      });

      it('should have all ranges within piano range', () => {
        const modes: PracticeRangeMode[] = ['central', 'upper', 'combined'];

        modes.forEach((mode) => {
          const range = getPracticeMidiRange(clef, mode);
          expect(range.min).toBeGreaterThanOrEqual(PIANO_MIN);
          expect(range.max).toBeLessThanOrEqual(PIANO_MAX);
        });
      });
    });

    describe('bass clef', () => {
      const clef = ClefType.BASS;
      const centerMidi = CLEF_CENTER_MIDI[clef]; // 50 (D3)

      it('should return central octave range for central mode', () => {
        const range = getPracticeMidiRange(clef, 'central');

        expect(range.min).toBeLessThanOrEqual(centerMidi);
        expect(range.max).toBeGreaterThanOrEqual(centerMidi);
        expect(range.max - range.min).toBe(11);
      });

      it('should return upper octave range for upper mode', () => {
        const range = getPracticeMidiRange(clef, 'upper');
        const centralRange = getPracticeMidiRange(clef, 'central');

        expect(range.min).toBe(centralRange.min + 12);
        expect(range.max).toBe(centralRange.max + 12);
        expect(range.max - range.min).toBe(11);
      });

      it('should return combined range for combined mode', () => {
        const range = getPracticeMidiRange(clef, 'combined');
        const centralRange = getPracticeMidiRange(clef, 'central');
        const upperRange = getPracticeMidiRange(clef, 'upper');

        expect(range.min).toBe(centralRange.min);
        expect(range.max).toBe(upperRange.max);
        expect(range.max - range.min).toBe(23);
      });

      it('should have all ranges within piano range', () => {
        const modes: PracticeRangeMode[] = ['central', 'upper', 'combined'];

        modes.forEach((mode) => {
          const range = getPracticeMidiRange(clef, mode);
          expect(range.min).toBeGreaterThanOrEqual(PIANO_MIN);
          expect(range.max).toBeLessThanOrEqual(PIANO_MAX);
        });
      });
    });

    describe('range validity', () => {
      const clefs: ClefType[] = [ClefType.TREBLE, ClefType.BASS];
      const modes: PracticeRangeMode[] = ['central', 'upper', 'combined'];

      it('should always have min < max for all combinations', () => {
        clefs.forEach((clef) => {
          modes.forEach((mode) => {
            const range = getPracticeMidiRange(clef, mode);
            expect(range.min).toBeLessThan(range.max);
          });
        });
      });

      it('should have valid MIDI values (0-127) for all combinations', () => {
        clefs.forEach((clef) => {
          modes.forEach((mode) => {
            const range = getPracticeMidiRange(clef, mode);
            expect(range.min).toBeGreaterThanOrEqual(0);
            expect(range.min).toBeLessThanOrEqual(127);
            expect(range.max).toBeGreaterThanOrEqual(0);
            expect(range.max).toBeLessThanOrEqual(127);
          });
        });
      });

      it('should have ranges within piano keyboard (21-108)', () => {
        clefs.forEach((clef) => {
          modes.forEach((mode) => {
            const range = getPracticeMidiRange(clef, mode);
            expect(range.min).toBeGreaterThanOrEqual(PIANO_MIN);
            expect(range.max).toBeLessThanOrEqual(PIANO_MAX);
          });
        });
      });

      it('should return different ranges for different clefs', () => {
        const trebleRange = getPracticeMidiRange(ClefType.TREBLE, 'central');
        const bassRange = getPracticeMidiRange(ClefType.BASS, 'central');

        // Treble and bass should have different (non-overlapping or minimally overlapping) ranges
        expect(trebleRange.min).not.toBe(bassRange.min);
        expect(trebleRange.max).not.toBe(bassRange.max);

        // Treble should generally be higher than bass
        expect(trebleRange.min).toBeGreaterThan(bassRange.min);
        expect(trebleRange.max).toBeGreaterThan(bassRange.max);
      });
    });

    describe('octave alignment', () => {
      it('should align ranges to octave boundaries (C notes)', () => {
        const clefs: ClefType[] = [ClefType.TREBLE, ClefType.BASS];

        clefs.forEach((clef) => {
          const centralRange = getPracticeMidiRange(clef, 'central');

          // Range min should be a C note (MIDI % 12 === 0)
          expect(centralRange.min % 12).toBe(0);
          // Range max should be a B note (MIDI % 12 === 11)
          expect(centralRange.max % 12).toBe(11);
        });
      });

      it('should have upper range exactly one octave above central', () => {
        const clefs: ClefType[] = [ClefType.TREBLE, ClefType.BASS];

        clefs.forEach((clef) => {
          const centralRange = getPracticeMidiRange(clef, 'central');
          const upperRange = getPracticeMidiRange(clef, 'upper');

          expect(upperRange.min - centralRange.min).toBe(12);
          expect(upperRange.max - centralRange.max).toBe(12);
        });
      });

      it('should have combined range spanning exactly two octaves', () => {
        const clefs: ClefType[] = [ClefType.TREBLE, ClefType.BASS];

        clefs.forEach((clef) => {
          const combinedRange = getPracticeMidiRange(clef, 'combined');

          // Two octaves = 24 semitones, but range is inclusive so max - min = 23
          expect(combinedRange.max - combinedRange.min).toBe(23);
        });
      });
    });

    describe('specific expected values', () => {
      it('should return correct ranges for treble clef', () => {
        // B4 is MIDI 71, octave starts at C4 (60)
        const central = getPracticeMidiRange(ClefType.TREBLE, 'central');
        expect(central.min).toBe(60); // C4
        expect(central.max).toBe(71); // B4

        const upper = getPracticeMidiRange(ClefType.TREBLE, 'upper');
        expect(upper.min).toBe(72); // C5
        expect(upper.max).toBe(83); // B5

        const combined = getPracticeMidiRange(ClefType.TREBLE, 'combined');
        expect(combined.min).toBe(60); // C4
        expect(combined.max).toBe(83); // B5
      });

      it('should return correct ranges for bass clef', () => {
        // D3 is MIDI 50, octave starts at C2 (36)
        const central = getPracticeMidiRange(ClefType.BASS, 'central');
        expect(central.min).toBe(48); // C3
        expect(central.max).toBe(59); // B3

        const upper = getPracticeMidiRange(ClefType.BASS, 'upper');
        expect(upper.min).toBe(60); // C4
        expect(upper.max).toBe(71); // B4

        const combined = getPracticeMidiRange(ClefType.BASS, 'combined');
        expect(combined.min).toBe(48); // C3
        expect(combined.max).toBe(71); // B4
      });
    });

    describe('edge cases', () => {
      it('should handle ranges consistently across function calls', () => {
        const range1 = getPracticeMidiRange(ClefType.TREBLE, 'central');
        const range2 = getPracticeMidiRange(ClefType.TREBLE, 'central');

        expect(range1).toEqual(range2);
      });

      it('should return new objects (not shared references)', () => {
        const range1 = getPracticeMidiRange(ClefType.TREBLE, 'central');
        const range2 = getPracticeMidiRange(ClefType.TREBLE, 'central');

        expect(range1).not.toBe(range2); // Different object references
        expect(range1).toEqual(range2); // But same values
      });
    });
  });
});
