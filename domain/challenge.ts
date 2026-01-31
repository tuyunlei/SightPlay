import { Note } from '../types';
import { createNoteFromMidi, noteStringToMidi } from './note';

export const buildChallengeNotes = (noteStrings: string[]): Note[] => {
  const notes: Note[] = [];
  noteStrings.forEach((noteStr, index) => {
    const midi = noteStringToMidi(noteStr);
    if (midi !== null) {
      notes.push(createNoteFromMidi(midi, index));
    }
  });
  return notes;
};

export const shouldCompleteChallenge = (queueLength: number, sequenceLength: number) =>
  sequenceLength > 0 && queueLength <= 1;
