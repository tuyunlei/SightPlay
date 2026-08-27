import { ClefType, Duration, HandPracticeMode, TimeSignature } from '../../types';

export type SongDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type SongCategory = 'classical' | 'folk' | 'exercise';

export interface SongFrame {
  readonly id: string;
  readonly index: number;
  readonly pitches: readonly [number, ...number[]];
  readonly duration: Duration;
}

export interface SongSource {
  readonly composer: string;
  readonly arranger: string;
  readonly sourceUrl: string;
  readonly license: string;
  readonly licenseUrl: string;
}

export interface Song {
  readonly id: string;
  readonly title: string;
  readonly difficulty: SongDifficulty;
  readonly category: SongCategory;
  readonly clef: ClefType;
  readonly handMode?: HandPracticeMode;
  readonly timeSignature: TimeSignature;
  readonly practiceFocus?: 'pitch';
  readonly source?: SongSource;
  readonly frames: readonly SongFrame[];
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
  composer?: string;
  practiceFocus?: 'pitch';
}
