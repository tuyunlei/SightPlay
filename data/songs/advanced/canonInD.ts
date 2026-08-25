import { ClefType } from '../../../types';
import type { Song, SongSource } from '../types';
import { createSongFrame } from '../utils';

const CANON_SOURCE: SongSource = {
  composer: 'Johann Pachelbel',
  arranger: 'SightPlay educational arrangement',
  sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2047',
  license: 'Creative Commons Attribution 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
};

const GROUND_BASS = [50, 45, 47, 42, 43, 38, 43, 45] as const;
const OPENING_MELODY = [
  66, 64, 62, 61, 59, 57, 59, 61, 62, 61, 59, 57, 55, 54, 55, 52, 62, 66, 69, 67, 66, 62, 66, 64,
  62, 59, 62, 69, 67, 71, 69, 67,
] as const;

// Pitch order follows the first violin line in Mutopia score 2047. Durations are deliberately
// normalized: SightPlay currently assesses pitch/chord identity, not performed note length.
const FLOWING_VARIATION = [
  78, 76, 74, 73, 71, 69, 71, 73, 74, 73, 71, 69, 67, 66, 67, 64, 62, 66, 69, 67, 66, 62, 66, 64,
  62, 59, 62, 69, 67, 71, 69, 67, 66, 62, 64, 73, 74, 78, 81, 69, 71, 67, 69, 66, 62, 74, 74, 73,
  74, 73, 74, 62, 61, 69, 64, 66, 62, 74, 73, 71, 73, 78, 81, 83, 79, 78, 76, 79, 78, 76, 74, 73,
  71, 69, 67, 66, 64, 67, 66, 64, 62, 64, 66, 67, 69, 64, 69, 67, 66, 71, 69, 67, 69, 67, 66, 64,
  62, 59, 71, 73, 74, 73, 71, 69, 67, 66, 64, 71, 69, 71, 69, 67, 66, 78, 76, 74, 78, 83, 81, 83,
  85, 86, 74, 73, 71, 74, 74, 74, 74, 79, 76, 81, 81, 78, 79, 81, 78, 79, 81, 69, 71, 73, 74, 76,
  78, 79, 78, 74, 76, 78, 66, 67, 69, 71, 69, 67, 69, 66, 67, 69,
] as const;

const singlePitchFrames = (pitches: readonly number[]) =>
  pitches.map((pitch, index) => createSongFrame([pitch], index));

export const canonGroundBass: Song = {
  id: 'canon-in-d-ground-bass',
  title: 'Canon in D — Ground Bass',
  difficulty: 'beginner',
  category: 'classical',
  clef: ClefType.BASS,
  handMode: 'left-hand',
  timeSignature: { beats: 4, beatUnit: 4 },
  practiceFocus: 'pitch',
  source: CANON_SOURCE,
  frames: singlePitchFrames([...GROUND_BASS, ...GROUND_BASS]),
};

export const canonInD: Song = {
  id: 'canon-in-d',
  title: 'Canon in D — Opening Melody',
  difficulty: 'beginner',
  category: 'classical',
  clef: ClefType.TREBLE,
  handMode: 'right-hand',
  timeSignature: { beats: 4, beatUnit: 4 },
  practiceFocus: 'pitch',
  source: CANON_SOURCE,
  frames: singlePitchFrames(OPENING_MELODY),
};

export const canonTwoHands: Song = {
  id: 'canon-in-d-two-hands',
  title: 'Canon in D — Two-Hand Theme',
  difficulty: 'intermediate',
  category: 'classical',
  clef: ClefType.TREBLE,
  handMode: 'both-hands',
  timeSignature: { beats: 4, beatUnit: 4 },
  practiceFocus: 'pitch',
  source: CANON_SOURCE,
  frames: OPENING_MELODY.map((pitch, index) =>
    createSongFrame([GROUND_BASS[index % GROUND_BASS.length], pitch], index)
  ),
};

export const canonFlowingVariation: Song = {
  id: 'canon-in-d-flowing-variation',
  title: 'Canon in D — Flowing Variation',
  difficulty: 'advanced',
  category: 'classical',
  clef: ClefType.TREBLE,
  handMode: 'right-hand',
  timeSignature: { beats: 4, beatUnit: 4 },
  practiceFocus: 'pitch',
  source: CANON_SOURCE,
  frames: singlePitchFrames(FLOWING_VARIATION),
};
