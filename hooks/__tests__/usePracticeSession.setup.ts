import { vi } from 'vitest';

export const mockOnMicError = vi.fn();
export const mockOnChallengeComplete = vi.fn();

export const mockActions = {
  setClef: vi.fn(),
  setPracticeRange: vi.fn(),
  setIsListening: vi.fn(),
  setIsMidiConnected: vi.fn(),
  setNoteQueue: vi.fn(),
  setExitingNotes: vi.fn(),
  setDetectedNote: vi.fn(),
  setStatus: vi.fn(),
  setScore: vi.fn(),
  setStreak: vi.fn(),
  setSessionStats: vi.fn(),
  setChallengeSequence: vi.fn(),
  setChallengeIndex: vi.fn(),
  setChallengeInfo: vi.fn(),
  resetStats: vi.fn(),
};

export const defaultMockState = {
  noteQueue: [],
  sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
  clef: 'treble' as any,
  practiceRange: 'combined' as const,
  exitingNotes: [],
  detectedNote: null,
  status: 'waiting' as any,
  score: 0,
  streak: 0,
  challengeSequence: [],
  challengeIndex: 0,
  challengeInfo: null,
  isListening: false,
  isMidiConnected: false,
};

export const mockRefs = {
  matchTimer: { current: 0 },
  wrongTimer: { current: 0 },
  lastHitTime: { current: 0 },
  hasMistakeForCurrent: { current: false },
  isProcessingRef: { current: false },
};

export const mockPressedKeysState = {
  pressedKeys: new Map(),
  pressedKeysRef: { current: new Map() },
  addPressedKey: vi.fn(),
  removePressedKey: vi.fn(),
};
