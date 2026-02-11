import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';


// Mock all sub-hooks and dependencies
vi.mock('./practiceSession/actions', () => ({
  useQueueInitialization: vi.fn(),
  useToggleMic: vi.fn(() => vi.fn()),
  useToggleClef: vi.fn(() => vi.fn()),
  useResetSessionStats: vi.fn(() => vi.fn()),
  useLoadChallenge: vi.fn(() => vi.fn()),
  useMicInput: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}));

vi.mock('./practiceSession/noteHandlers', () => ({
  useDetectedNoteUpdater: vi.fn(() => vi.fn()),
  useHandleCorrectNote: vi.fn(() => vi.fn()),
  useMicNoteHandler: vi.fn(() => vi.fn()),
  useMidiNoteHandlers: vi.fn(() => ({
    handleMidiNoteOn: vi.fn(),
    handleMidiNoteOff: vi.fn(),
  })),
}));

vi.mock('./practiceSession/slices', () => ({
  usePracticeStateSlice: vi.fn(),
  usePracticeActionsSlice: vi.fn(),
  usePracticeRefs: vi.fn(() => ({
    matchTimer: { current: 0 },
    wrongTimer: { current: 0 },
    lastHitTime: { current: 0 },
    hasMistakeForCurrent: { current: false },
    isProcessingRef: { current: false },
  })),
  usePressedKeysState: vi.fn(() => ({
    pressedKeys: new Map(),
    pressedKeysRef: { current: new Map() },
    addPressedKey: vi.fn(),
    removePressedKey: vi.fn(),
  })),
}));

vi.mock('./useAudioInput', () => ({
  useAudioInput: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}));

vi.mock('./useMidiInput', () => ({
  useMidiInput: vi.fn(),
}));

vi.mock('../domain/scoring', () => ({
  computeAccuracy: vi.fn((stats) => {
    if (stats.totalAttempts === 0) return 100;
    return Math.round((stats.cleanHits / stats.totalAttempts) * 100);
  }),
}));

import { computeAccuracy } from '../domain/scoring';

import {
  usePracticeStateSlice,
  usePracticeActionsSlice,
  usePracticeRefs,
  usePressedKeysState,
} from './practiceSession/slices';
import { usePracticeSession } from './usePracticeSession';

describe('usePracticeSession', () => {
  const mockOnMicError = vi.fn();
  const mockOnChallengeComplete = vi.fn();

  const mockActions = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePracticeActionsSlice).mockReturnValue(mockActions);
    vi.mocked(usePracticeRefs).mockReturnValue({
      matchTimer: { current: 0 },
      wrongTimer: { current: 0 },
      lastHitTime: { current: 0 },
      hasMistakeForCurrent: { current: false },
      isProcessingRef: { current: false },
    });
    vi.mocked(usePressedKeysState).mockReturnValue({
      pressedKeys: new Map(),
      pressedKeysRef: { current: new Map() },
      addPressedKey: vi.fn(),
      removePressedKey: vi.fn(),
    });
  });

  describe('targetNote calculation', () => {
    it('returns first note from noteQueue when queue is not empty', () => {
      const mockNote = { midi: 60, name: 'C4' };
      vi.mocked(usePracticeStateSlice).mockReturnValue({
        noteQueue: [mockNote, { midi: 64, name: 'E4' }],
        sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
        clef: 'treble' as any,
        practiceRange: 'combined',
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
      });

      const { result } = renderHook(() =>
        usePracticeSession({
          onMicError: mockOnMicError,
          onChallengeComplete: mockOnChallengeComplete,
        })
      );

      expect(result.current.derived.targetNote).toEqual(mockNote);
    });

    it('returns null when noteQueue is empty', () => {
      vi.mocked(usePracticeStateSlice).mockReturnValue({
        noteQueue: [],
        sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
        clef: 'treble' as any,
        practiceRange: 'combined',
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
      });

      const { result } = renderHook(() =>
        usePracticeSession({
          onMicError: mockOnMicError,
          onChallengeComplete: mockOnChallengeComplete,
        })
      );

      expect(result.current.derived.targetNote).toBeNull();
    });
  });

  describe('accuracy calculation', () => {
    it('computes accuracy from sessionStats', () => {
      vi.mocked(usePracticeStateSlice).mockReturnValue({
        noteQueue: [],
        sessionStats: { totalAttempts: 10, cleanHits: 7, bpm: 60 },
        clef: 'treble' as any,
        practiceRange: 'combined',
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
      });

      const { result } = renderHook(() =>
        usePracticeSession({
          onMicError: mockOnMicError,
          onChallengeComplete: mockOnChallengeComplete,
        })
      );

      expect(result.current.derived.accuracy).toBe(70);
      expect(computeAccuracy).toHaveBeenCalledWith({ totalAttempts: 10, cleanHits: 7, bpm: 60 });
    });

    it('returns 100% accuracy when no attempts made', () => {
      vi.mocked(usePracticeStateSlice).mockReturnValue({
        noteQueue: [],
        sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
        clef: 'treble' as any,
        practiceRange: 'combined',
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
      });

      const { result } = renderHook(() =>
        usePracticeSession({
          onMicError: mockOnMicError,
          onChallengeComplete: mockOnChallengeComplete,
        })
      );

      expect(result.current.derived.accuracy).toBe(100);
    });

    it('recalculates accuracy when sessionStats change', () => {
      const { result, rerender } = renderHook(
        ({ stats }) => {
          vi.mocked(usePracticeStateSlice).mockReturnValue({
            noteQueue: [],
            sessionStats: stats,
            clef: 'treble' as any,
            practiceRange: 'combined',
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
          });
          return usePracticeSession({
            onMicError: mockOnMicError,
            onChallengeComplete: mockOnChallengeComplete,
          });
        },
        {
          initialProps: { stats: { totalAttempts: 10, cleanHits: 7, bpm: 60 } },
        }
      );

      expect(result.current.derived.accuracy).toBe(70);

      // Update stats
      rerender({ stats: { totalAttempts: 10, cleanHits: 9, bpm: 60 } });

      expect(result.current.derived.accuracy).toBe(90);
    });
  });

  describe('returned structure', () => {
    it('returns state from usePracticeStateSlice', () => {
      const mockState = {
        noteQueue: [{ midi: 60, name: 'C4' }],
        sessionStats: { totalAttempts: 5, cleanHits: 4, bpm: 120 },
        clef: 'bass' as any,
        practiceRange: 'treble',
        exitingNotes: [],
        detectedNote: { midi: 62, name: 'D4' },
        status: 'listening' as any,
        score: 100,
        streak: 3,
        challengeSequence: [],
        challengeIndex: 0,
        challengeInfo: null,
        isListening: true,
        isMidiConnected: true,
      };

      vi.mocked(usePracticeStateSlice).mockReturnValue(mockState);

      const { result } = renderHook(() =>
        usePracticeSession({
          onMicError: mockOnMicError,
          onChallengeComplete: mockOnChallengeComplete,
        })
      );

      expect(result.current.state).toEqual(mockState);
    });

    it('returns actions object with all required methods', () => {
      vi.mocked(usePracticeStateSlice).mockReturnValue({
        noteQueue: [],
        sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
        clef: 'treble' as any,
        practiceRange: 'combined',
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
      });

      const { result } = renderHook(() =>
        usePracticeSession({
          onMicError: mockOnMicError,
          onChallengeComplete: mockOnChallengeComplete,
        })
      );

      expect(result.current.actions).toHaveProperty('toggleMic');
      expect(result.current.actions).toHaveProperty('toggleClef');
      expect(result.current.actions).toHaveProperty('resetSessionStats');
      expect(result.current.actions).toHaveProperty('loadChallenge');
      expect(result.current.actions).toHaveProperty('setPracticeRange');
      expect(result.current.actions).toHaveProperty('setDetectedNote');
      expect(result.current.actions).toHaveProperty('setIsListening');
      expect(result.current.actions).toHaveProperty('setStatus');
      expect(result.current.actions).toHaveProperty('setNoteQueue');

      expect(typeof result.current.actions.toggleMic).toBe('function');
      expect(typeof result.current.actions.toggleClef).toBe('function');
      expect(typeof result.current.actions.resetSessionStats).toBe('function');
      expect(typeof result.current.actions.loadChallenge).toBe('function');
    });

    it('returns pressedKeys from usePressedKeysState', () => {
      const mockPressedKeys = new Map([[60, { note: { midi: 60, name: 'C4' }, isCorrect: true }]]);

      vi.mocked(usePressedKeysState).mockReturnValue({
        pressedKeys: mockPressedKeys,
        pressedKeysRef: { current: mockPressedKeys },
        addPressedKey: vi.fn(),
        removePressedKey: vi.fn(),
      });

      vi.mocked(usePracticeStateSlice).mockReturnValue({
        noteQueue: [],
        sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
        clef: 'treble' as any,
        practiceRange: 'combined',
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
      });

      const { result } = renderHook(() =>
        usePracticeSession({
          onMicError: mockOnMicError,
          onChallengeComplete: mockOnChallengeComplete,
        })
      );

      expect(result.current.pressedKeys).toBe(mockPressedKeys);
      expect(result.current.pressedKeys.size).toBe(1);
      expect(result.current.pressedKeys.get(60)).toEqual({
        note: { midi: 60, name: 'C4' },
        isCorrect: true,
      });
    });
  });

  describe('actions delegation', () => {
    it('exposes setPracticeRange from actions slice', () => {
      vi.mocked(usePracticeStateSlice).mockReturnValue({
        noteQueue: [],
        sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
        clef: 'treble' as any,
        practiceRange: 'combined',
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
      });

      const { result } = renderHook(() =>
        usePracticeSession({
          onMicError: mockOnMicError,
          onChallengeComplete: mockOnChallengeComplete,
        })
      );

      expect(result.current.actions.setPracticeRange).toBe(mockActions.setPracticeRange);
      expect(result.current.actions.setDetectedNote).toBe(mockActions.setDetectedNote);
      expect(result.current.actions.setIsListening).toBe(mockActions.setIsListening);
      expect(result.current.actions.setStatus).toBe(mockActions.setStatus);
      expect(result.current.actions.setNoteQueue).toBe(mockActions.setNoteQueue);
    });
  });
});
