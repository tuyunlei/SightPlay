import { create } from 'zustand';

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

interface PracticeActions {
  setClef: (clef: ClefType) => void;
  setPracticeRange: (practiceRange: PracticeRangeMode) => void;
  setHandMode: (handMode: HandPracticeMode) => void;
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
  setPracticeMode: (practiceMode: PracticeMode) => void;
  setCurrentSongId: (currentSongId: string | null) => void;
  setSongProgress: (songProgress: number) => void;
  setSongTotalNotes: (songTotalNotes: number) => void;
  setSongStartTime: (songStartTime: number | null) => void;
  resetStats: () => void;
}

const initialStats: SessionStats = {
  totalAttempts: 0,
  cleanHits: 0,
  bpm: 0,
};

export const usePracticeStore = create<PracticeState & PracticeActions>((set) => ({
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
  sessionStats: initialStats,
  challengeSequence: [],
  challengeIndex: 0,
  challengeInfo: null,
  practiceMode: 'random',
  currentSongId: null,
  songProgress: 0,
  songTotalNotes: 0,
  songStartTime: null,
  setClef: (clef) => set({ clef }),
  setPracticeRange: (practiceRange) => set({ practiceRange }),
  setHandMode: (handMode) => set({ handMode }),
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
  setPracticeMode: (practiceMode) => set({ practiceMode }),
  setCurrentSongId: (currentSongId) => set({ currentSongId }),
  setSongProgress: (songProgress) => set({ songProgress }),
  setSongTotalNotes: (songTotalNotes) => set({ songTotalNotes }),
  setSongStartTime: (songStartTime) => set({ songStartTime }),
  resetStats: () =>
    set({
      score: 0,
      streak: 0,
      sessionStats: initialStats,
      songProgress: 0,
      songStartTime: null,
    }),
}));
