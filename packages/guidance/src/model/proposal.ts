import type { ExerciseProposal, GuidanceProviderReply } from './types';

export function createExerciseProposal(
  value: NonNullable<GuidanceProviderReply['challengeData']>
): ExerciseProposal | null {
  if (value.notes.length === 0) return null;
  const title = value.title.trim();
  const description = value.description.trim();
  if (!title || !description || value.notes.some((note) => !isScientificPitch(note))) return null;
  return {
    title,
    description,
    notes: value.notes.map((note) => note.trim()) as [string, ...string[]],
  };
}

function isScientificPitch(value: string): boolean {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(value.trim());
  if (!match) return false;
  const naturalIndex = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(match[1]);
  const semitones = [0, 2, 4, 5, 7, 9, 11];
  const midi = (Number(match[3]) + 1) * 12 + semitones[naturalIndex] + (match[2] ? 1 : 0);
  return Number.isInteger(midi) && midi >= 0 && midi <= 127;
}
