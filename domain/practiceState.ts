import { ClefType, GeneratedChallenge, HandPracticeMode, Note, PracticeRangeMode } from '../types';
import { SessionStats } from '../types/session';

export type PracticeStatus = 'waiting' | 'listening' | 'correct' | 'incorrect';
export type PracticeMode = 'random' | 'song';

export interface PracticeState {
  clef: ClefType;
  practiceRange: PracticeRangeMode;
  handMode: HandPracticeMode;
  isListening: boolean;
  isMidiConnected: boolean;
  noteQueue: Note[];
  exitingNotes: Note[];
  detectedNote: Note | null;
  status: PracticeStatus;
  score: number;
  streak: number;
  sessionStats: SessionStats;
  challengeSequence: Note[];
  challengeIndex: number;
  challengeInfo: GeneratedChallenge | null;
  practiceMode: PracticeMode;
  currentSongId: string | null;
  songProgress: number;
  songTotalNotes: number;
  songStartTime: number | null;
}

export const initialPracticeState: PracticeState = {
  clef: ClefType.TREBLE,
  practiceRange: 'combined',
  handMode: 'right-hand',
  isListening: false,
  isMidiConnected: false,
  noteQueue: [],
  exitingNotes: [],
  detectedNote: null,
  status: 'waiting',
  score: 0,
  streak: 0,
  sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
  challengeSequence: [],
  challengeIndex: 0,
  challengeInfo: null,
  practiceMode: 'random',
  currentSongId: null,
  songProgress: 0,
  songTotalNotes: 0,
  songStartTime: null,
};

export type PracticeAction =
  | { type: 'clefChanged'; clef: ClefType }
  | { type: 'practiceRangeChanged'; practiceRange: PracticeRangeMode }
  | { type: 'handModeChanged'; handMode: HandPracticeMode }
  | { type: 'listeningChanged'; isListening: boolean }
  | { type: 'midiConnectionChanged'; isMidiConnected: boolean }
  | { type: 'queueReplaced'; noteQueue: Note[] }
  | { type: 'exitingNotesReplaced'; exitingNotes: Note[] }
  | { type: 'detectedNoteChanged'; detectedNote: Note | null }
  | { type: 'statusChanged'; status: PracticeStatus }
  | { type: 'scoreChanged'; score: number }
  | { type: 'streakChanged'; streak: number }
  | { type: 'sessionStatsChanged'; sessionStats: SessionStats }
  | { type: 'challengeSequenceChanged'; challengeSequence: Note[] }
  | { type: 'challengeIndexChanged'; challengeIndex: number }
  | { type: 'challengeInfoChanged'; challengeInfo: GeneratedChallenge | null }
  | { type: 'practiceModeChanged'; practiceMode: PracticeMode }
  | { type: 'songChanged'; songId: string | null }
  | { type: 'songProgressChanged'; songProgress: number }
  | { type: 'songTotalNotesChanged'; songTotalNotes: number }
  | { type: 'songStarted'; startedAt: number | null }
  | { type: 'sessionStatsReset' }
  | {
      type: 'challengeLoaded';
      challenge: GeneratedChallenge;
      challengeSequence: Note[];
      noteQueue: Note[];
    }
  | {
      type: 'correctNoteAccepted';
      acceptedAt: number;
      previousHitAt: number;
      hadMistake: boolean;
      nextQueue: Note[];
      nextChallengeIndex: number;
    }
  | { type: 'exitAnimationElapsed'; noteId: string }
  | { type: 'challengeResetElapsed'; noteQueue: Note[] };

export type PracticeEffect =
  | { type: 'scheduleExitCleanup'; noteId: string; delayMs: number }
  | {
      type: 'completeChallenge';
      delayMs: number;
      clef: ClefType;
      practiceRange: PracticeRangeMode;
      handMode: HandPracticeMode;
    };

export type PracticeReduction = {
  state: PracticeState;
  effects: PracticeEffect[];
};
