import { Note } from '../../types';

import { StaffLayout } from './staffLayout';

export const getStaffSteps = (midi: number, centerMidi: number) => {
  const diatonicScale = [0, 2, 4, 5, 7, 9, 11];
  const getDiatonicIndex = (m: number) => {
    const octave = Math.floor(m / 12);
    const semitone = m % 12;
    let step = 0;
    for (let i = 0; i < diatonicScale.length; i++) {
      if (diatonicScale[i] === semitone) {
        step = i;
        break;
      }
      if (diatonicScale[i] > semitone) {
        step = i > 0 ? i - 1 : 6;
        break;
      }
      step = i;
    }
    return octave * 7 + step;
  };
  return getDiatonicIndex(midi) - getDiatonicIndex(centerMidi);
};

export const getNoteY = (midi: number, centerMidi: number, layout: StaffLayout) => {
  const stepsFromCenter = getStaffSteps(midi, centerMidi);
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
