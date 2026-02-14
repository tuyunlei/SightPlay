import { createNoteFromMidi } from '../../domain/note';
import { Duration, Note } from '../../types';

export const createSongNote = (
  midi: number,
  globalIndex: number,
  duration: Duration = 'quarter'
): Note => {
  const note = createNoteFromMidi(midi, globalIndex, duration);
  return note;
};
