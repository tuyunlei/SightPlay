import { DURATION_BEATS } from '../../config/music';
import { Note, TimeSignature } from '../../types';

const BEAT_EPSILON = 1e-6;

const getBeatsPerMeasure = (timeSignature: TimeSignature): number =>
  timeSignature.beats * (4 / timeSignature.beatUnit);

const getNoteBeats = (note: Note): number => DURATION_BEATS[note.duration ?? 'quarter'];

export const shouldShowBarLine = (
  notes: Note[],
  index: number,
  timeSignature: TimeSignature
): boolean => {
  if (index <= 0 || index >= notes.length) return false;

  const beatsPerMeasure = getBeatsPerMeasure(timeSignature);
  if (beatsPerMeasure <= 0) return false;

  let elapsedBeats = 0;
  for (let i = 0; i < index; i++) {
    elapsedBeats += getNoteBeats(notes[i]);
  }

  const remainder = elapsedBeats % beatsPerMeasure;
  return remainder < BEAT_EPSILON || beatsPerMeasure - remainder < BEAT_EPSILON;
};
