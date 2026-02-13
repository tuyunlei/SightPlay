export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export type TimeSignature = {
  beats: number;
  beatUnit: number;
};

export interface Note {
  id: string; // Unique ID for React keys and animation
  name: NoteName;
  octave: number;
  frequency: number;
  midi: number;
  globalIndex: number; // Position in the overall sequence (0, 1, 2, 3...) used for bar lines
  duration?: Duration;
}

export enum ClefType {
  TREBLE = 'treble',
  BASS = 'bass',
}

export type PracticeRangeMode = 'central' | 'upper' | 'combined';

export interface GeneratedChallenge {
  title: string;
  notes: string[]; // e.g., ["C4", "E4", "G4"]
  description: string;
}

export interface AiResponse {
  replyText: string;
  challengeData?: GeneratedChallenge | null;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  hasAction?: boolean;
}
