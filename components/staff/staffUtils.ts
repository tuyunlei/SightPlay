import { Note } from '../../types';

import { StaffLayout } from './staffLayout';

export const getStaffSteps = (note: Note, centerMidi: number) => {
  const diatonicScale = [0, 2, 4, 5, 7, 9, 11];
  const getDiatonicIndex = (m: number, isFlat: boolean) => {
    const octave = Math.floor(m / 12);
    const semitone = m % 12;
    let step = 0;
    for (let i = 0; i < diatonicScale.length; i++) {
      if (diatonicScale[i] === semitone) {
        step = i;
        break;
      }
      if (diatonicScale[i] > semitone) {
        // For flats, position at the note above (e.g., Db at D's position)
        // For sharps, position at the note below (e.g., C# at C's position)
        step = isFlat ? i : i > 0 ? i - 1 : 6;
        break;
      }
      step = i;
    }
    return octave * 7 + step;
  };
  // For center note (which is always natural), we don't need flat consideration
  const centerIndex = getDiatonicIndex(centerMidi, false);
  const noteIndex = getDiatonicIndex(note.midi, note.name.includes('b'));
  return noteIndex - centerIndex;
};

export const getNoteY = (note: Note, centerMidi: number, layout: StaffLayout) => {
  const stepsFromCenter = getStaffSteps(note, centerMidi);
  return layout.STAFF_CENTER_Y - stepsFromCenter * layout.STAFF_HALF_SPACE;
};

export const buildLedgers = (y: number, layout: StaffLayout) => {
  const ledgers: number[] = [];
  if (y >= layout.STAFF_BOTTOM_Y + layout.STAFF_HALF_SPACE) {
    for (let ly = layout.STAFF_BOTTOM_Y + layout.STAFF_SPACE; ly <= y; ly += layout.STAFF_SPACE) {
      ledgers.push(ly);
    }
  }
  if (y <= layout.STAFF_TOP_Y - layout.STAFF_HALF_SPACE) {
    for (let ly = layout.STAFF_TOP_Y - layout.STAFF_SPACE; ly >= y; ly -= layout.STAFF_SPACE) {
      ledgers.push(ly);
    }
  }
  return ledgers;
};

export type NoteColorParams = {
  isExiting: boolean;
  index: number;
  detectedNote: Note | null;
  activeNote: Note | undefined;
};

export const getNoteColor = ({ isExiting, index, detectedNote, activeNote }: NoteColorParams) => {
  if (isExiting) return '#22c55e';
  if (index === 0 && detectedNote && activeNote) {
    if (detectedNote.midi === activeNote.midi) return '#22c55e';
  }
  if (index === 0) return '#1e293b';
  return '#0f172a';
};

export const isSharp = (note: Note) => note.name.includes('#');

export const isFlat = (note: Note) => note.name.includes('b');

export const getAccidental = (note: Note): 'sharp' | 'flat' | 'none' => {
  if (note.name.includes('#')) return 'sharp';
  if (note.name.includes('b')) return 'flat';
  return 'none';
};
