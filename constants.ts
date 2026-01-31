import { Note } from './types';
import { createNoteFromMidi } from './domain/note';
import {
  NOTE_NAMES,
  TREBLE_RANGE,
  BASS_RANGE,
  STAFF_LINE_NOTES_TREBLE,
  STAFF_LINE_NOTES_BASS,
  SOLFEGE_MAP,
  NUMBER_MAP,
  getNoteLabels
} from './config/music';

// Helper for static list generation if needed
export { NOTE_NAMES, TREBLE_RANGE, BASS_RANGE, STAFF_LINE_NOTES_TREBLE, STAFF_LINE_NOTES_BASS, SOLFEGE_MAP, NUMBER_MAP, getNoteLabels, createNoteFromMidi };

export const NOTES: Note[] = [];
for (let i = 36; i <= 84; i++) {
  NOTES.push(createNoteFromMidi(i, 0));
}
