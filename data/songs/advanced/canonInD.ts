import { ClefType } from '../../../types';
import type { Song, SongSource } from '../types';
import { createSongFrame } from '../utils';

const CANON_SOURCE: SongSource = {
  composer: 'Johann Pachelbel',
  arranger: 'SightPlay educational arrangement in D major',
  sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2047',
  license: 'Creative Commons Attribution 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
};

const WHITE_KEY_SOURCE: SongSource = {
  ...CANON_SOURCE,
  arranger: 'SightPlay white-key arrangement in C major',
};

// The first three lessons transpose the familiar descending line from D major to C major. Keeping
// each hand within a compact, all-natural range makes them decoding exercises instead of black-key
// and large-leap drills.
const WHITE_KEY_GROUND_BASS = [48, 43, 45, 40, 41, 36, 41, 43] as const;
const WHITE_KEY_MELODY = [64, 62, 60, 59, 57, 55, 57, 59] as const;

// Pitch order follows the first violin line in Mutopia score 2047. Durations are deliberately
// normalized: SightPlay currently assesses pitch/chord identity, not performed note length.
const ORIGINAL_KEY_VARIATION = [
  78, 76, 74, 73, 71, 69, 71, 73, 74, 73, 71, 69, 67, 66, 67, 64, 62, 66, 69, 67, 66, 62, 66, 64,
  62, 59, 62, 69, 67, 71, 69, 67,
] as const;

const singlePitchFrames = (pitches: readonly number[]) =>
  pitches.map((pitch, index) => createSongFrame([pitch], index));

const pairedFrames = (bass: readonly number[], melody: readonly number[]) => {
  if (bass.length !== melody.length) throw new Error('Canon hand parts must have equal lengths');
  return melody.map((pitch, index) => {
    const bassPitch = bass[index];
    if (bassPitch === undefined) throw new Error(`Missing Canon bass pitch at frame ${index}`);
    return createSongFrame([bassPitch, pitch], index);
  });
};

export const canonGroundBass: Song = {
  id: 'canon-in-d-ground-bass',
  title: 'Pachelbel Canon — White-Key Bass',
  difficulty: 'beginner',
  category: 'classical',
  clef: ClefType.BASS,
  handMode: 'left-hand',
  timeSignature: { beats: 4, beatUnit: 4 },
  practiceFocus: 'pitch',
  source: WHITE_KEY_SOURCE,
  frames: singlePitchFrames(WHITE_KEY_GROUND_BASS),
};

export const canonInD: Song = {
  id: 'canon-in-d',
  title: 'Pachelbel Canon — White-Key Melody',
  difficulty: 'beginner',
  category: 'classical',
  clef: ClefType.TREBLE,
  handMode: 'right-hand',
  timeSignature: { beats: 4, beatUnit: 4 },
  practiceFocus: 'pitch',
  source: WHITE_KEY_SOURCE,
  frames: singlePitchFrames(WHITE_KEY_MELODY),
};

export const canonTwoHands: Song = {
  id: 'canon-in-d-two-hands',
  title: 'Pachelbel Canon — White-Key Two Hands',
  difficulty: 'intermediate',
  category: 'classical',
  clef: ClefType.TREBLE,
  handMode: 'both-hands',
  timeSignature: { beats: 4, beatUnit: 4 },
  practiceFocus: 'pitch',
  source: WHITE_KEY_SOURCE,
  frames: pairedFrames(WHITE_KEY_GROUND_BASS, WHITE_KEY_MELODY),
};

export const canonFlowingVariation: Song = {
  id: 'canon-in-d-flowing-variation',
  title: 'Canon in D — Original-Key Phrase',
  difficulty: 'advanced',
  category: 'classical',
  clef: ClefType.TREBLE,
  handMode: 'right-hand',
  timeSignature: { beats: 4, beatUnit: 4 },
  practiceFocus: 'pitch',
  source: CANON_SOURCE,
  frames: singlePitchFrames(ORIGINAL_KEY_VARIATION),
};
