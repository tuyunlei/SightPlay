import { create } from 'zustand';

import {
  initialPracticeState,
  PracticeAction,
  PracticeEffect,
  PracticeMode,
  PracticeState,
  PracticeStatus,
  reducePractice,
} from '../domain/practiceCore';
import { ClefType, GeneratedChallenge, HandPracticeMode, Note, PracticeRangeMode } from '../types';
import { SessionStats } from '../types/session';

export type { PracticeMode, PracticeState, PracticeStatus } from '../domain/practiceCore';

export interface PracticeStoreActions {
  dispatch: (action: PracticeAction) => PracticeEffect[];
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

export const usePracticeStore = create<PracticeState & PracticeStoreActions>((set) => {
  const dispatch = (action: PracticeAction): PracticeEffect[] => {
    let effects: PracticeEffect[] = [];
    set((current) => {
      const reduction = reducePractice(current, action);
      effects = reduction.effects;
      return reduction.state;
    });
    return effects;
  };

  return {
    ...initialPracticeState,
    dispatch,
    setClef: (clef) => void dispatch({ type: 'clefChanged', clef }),
    setPracticeRange: (practiceRange) =>
      void dispatch({ type: 'practiceRangeChanged', practiceRange }),
    setHandMode: (handMode) => void dispatch({ type: 'handModeChanged', handMode }),
    setIsListening: (isListening) => void dispatch({ type: 'listeningChanged', isListening }),
    setIsMidiConnected: (isMidiConnected) =>
      void dispatch({ type: 'midiConnectionChanged', isMidiConnected }),
    setNoteQueue: (noteQueue) => void dispatch({ type: 'queueReplaced', noteQueue }),
    setExitingNotes: (exitingNotes) =>
      void dispatch({ type: 'exitingNotesReplaced', exitingNotes }),
    setDetectedNote: (detectedNote) => void dispatch({ type: 'detectedNoteChanged', detectedNote }),
    setStatus: (status) => void dispatch({ type: 'statusChanged', status }),
    setScore: (score) => void dispatch({ type: 'scoreChanged', score }),
    setStreak: (streak) => void dispatch({ type: 'streakChanged', streak }),
    setSessionStats: (sessionStats) => void dispatch({ type: 'sessionStatsChanged', sessionStats }),
    setChallengeSequence: (challengeSequence) =>
      void dispatch({ type: 'challengeSequenceChanged', challengeSequence }),
    setChallengeIndex: (challengeIndex) =>
      void dispatch({ type: 'challengeIndexChanged', challengeIndex }),
    setChallengeInfo: (challengeInfo) =>
      void dispatch({ type: 'challengeInfoChanged', challengeInfo }),
    setPracticeMode: (practiceMode) => void dispatch({ type: 'practiceModeChanged', practiceMode }),
    setCurrentSongId: (songId) => void dispatch({ type: 'songChanged', songId }),
    setSongProgress: (songProgress) => void dispatch({ type: 'songProgressChanged', songProgress }),
    setSongTotalNotes: (songTotalNotes) =>
      void dispatch({ type: 'songTotalNotesChanged', songTotalNotes }),
    setSongStartTime: (startedAt) => void dispatch({ type: 'songStarted', startedAt }),
    resetStats: () => void dispatch({ type: 'sessionStatsReset' }),
  };
});
