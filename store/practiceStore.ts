import { create } from 'zustand';
import { ClefType, GeneratedChallenge, Note } from '../types';
import { SessionStats } from '../types/session';

export type PracticeStatus = 'waiting' | 'listening' | 'correct' | 'incorrect';

export interface PracticeState {
  clef: ClefType;
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
}

interface PracticeActions {
  setClef: (clef: ClefType) => void;
  setIsListening: (isListening: boolean) => void;
  setIsMidiConnected: (isMidiConnected: boolean) => void;
  setNoteQueue: (noteQueue: Note[]) => void;
  setExitingNotes: (exitingNotes: Note[]) => void;
  setDetectedNote: (detectedNote: Note | null) => void;
  setStatus: (status: PracticeStatus) => void;
  setScore: (score: number) => void;
  setStreak: (streak: number) => void;
  setSessionStats: (sessionStats: SessionStats) => void;
  setChallengeSequence: (challengeSequence: Note[]) => void;
  setChallengeIndex: (challengeIndex: number) => void;
  setChallengeInfo: (challengeInfo: GeneratedChallenge | null) => void;
  resetStats: () => void;
}

const initialStats: SessionStats = {
  totalAttempts: 0,
  cleanHits: 0,
  bpm: 0
};

export const usePracticeStore = create<PracticeState & PracticeActions>((set) => ({
  clef: ClefType.TREBLE,
  isListening: false,
  isMidiConnected: false,
  noteQueue: [],
  exitingNotes: [],
  detectedNote: null,
  status: 'waiting',
  score: 0,
  streak: 0,
  sessionStats: initialStats,
  challengeSequence: [],
  challengeIndex: 0,
  challengeInfo: null,
  setClef: (clef) => set({ clef }),
  setIsListening: (isListening) => set({ isListening }),
  setIsMidiConnected: (isMidiConnected) => set({ isMidiConnected }),
  setNoteQueue: (noteQueue) => set({ noteQueue }),
  setExitingNotes: (exitingNotes) => set({ exitingNotes }),
  setDetectedNote: (detectedNote) => set({ detectedNote }),
  setStatus: (status) => set({ status }),
  setScore: (score) => set({ score }),
  setStreak: (streak) => set({ streak }),
  setSessionStats: (sessionStats) => set({ sessionStats }),
  setChallengeSequence: (challengeSequence) => set({ challengeSequence }),
  setChallengeIndex: (challengeIndex) => set({ challengeIndex }),
  setChallengeInfo: (challengeInfo) => set({ challengeInfo }),
  resetStats: () => set({ score: 0, streak: 0, sessionStats: initialStats })
}));
