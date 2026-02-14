import { ClefType, Note, TimeSignature } from '../../types';

export type SongDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type SongCategory = 'classical' | 'folk' | 'exercise';

export interface Song {
  id: string;
  title: string;
  difficulty: SongDifficulty;
  category: SongCategory;
  clef: ClefType;
  timeSignature: TimeSignature;
  notes: Note[];
}

export interface SongMetadata {
  id: string;
  title: string;
  difficulty: SongDifficulty;
  category: SongCategory;
  clef: ClefType;
  timeSignature: TimeSignature;
  noteCount: number;
  estimatedDuration: number; // in seconds
}
