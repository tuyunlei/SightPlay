import { ClefType, PracticeRangeMode } from '../types';

import { CLEF_CENTER_MIDI } from './music';

export type MidiRange = { min: number; max: number };

const OCTAVE_SIZE = 12;

const getOctaveRange = (midi: number): MidiRange => {
  const start = Math.floor(midi / OCTAVE_SIZE) * OCTAVE_SIZE;
  return { min: start, max: start + OCTAVE_SIZE - 1 };
};

export const getPracticeMidiRange = (clef: ClefType, mode: PracticeRangeMode): MidiRange => {
  const center = getOctaveRange(CLEF_CENTER_MIDI[clef]);
  const upper = { min: center.min + OCTAVE_SIZE, max: center.max + OCTAVE_SIZE };

  if (mode === 'central') return center;
  if (mode === 'upper') return upper;
  return { min: center.min, max: upper.max };
};
