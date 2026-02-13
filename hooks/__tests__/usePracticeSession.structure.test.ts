import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock all sub-hooks and dependencies - must be at the top level
vi.mock('../practiceSession/actions', () => ({
  useQueueInitialization: vi.fn(),
  useToggleMic: vi.fn(() => vi.fn()),
  useToggleClef: vi.fn(() => vi.fn()),
  useResetSessionStats: vi.fn(() => vi.fn()),
  useLoadChallenge: vi.fn(() => vi.fn()),
  useMicInput: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}));

vi.mock('../practiceSession/noteHandlers', () => ({
  useDetectedNoteUpdater: vi.fn(() => vi.fn()),
  useHandleCorrectNote: vi.fn(() => vi.fn()),
  useMicNoteHandler: vi.fn(() => vi.fn()),
  useMidiNoteHandlers: vi.fn(() => ({
    handleMidiNoteOn: vi.fn(),
    handleMidiNoteOff: vi.fn(),
  })),
}));

vi.mock('../practiceSession/slices', () => ({
  usePracticeStateSlice: vi.fn(),
  usePracticeActionsSlice: vi.fn(),
  usePracticeRefs: vi.fn(),
  usePressedKeysState: vi.fn(),
}));

vi.mock('../useAudioInput', () => ({
  useAudioInput: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}));

vi.mock('../useMidiInput', () => ({
  useMidiInput: vi.fn(),
}));

vi.mock('../../domain/scoring', () => ({
  computeAccuracy: vi.fn((stats) => {
    if (stats.totalAttempts === 0) return 100;
    return Math.round((stats.cleanHits / stats.totalAttempts) * 100);
  }),
}));

import {
  usePracticeStateSlice,
  usePracticeActionsSlice,
  usePracticeRefs,
  usePressedKeysState,
} from '../practiceSession/slices';
import { usePracticeSession } from '../usePracticeSession';

import {
  mockOnMicError,
  mockOnChallengeComplete,
  mockActions,
  mockRefs,
  mockPressedKeysState,
  defaultMockState,
} from './usePracticeSession.setup';

describe('usePracticeSession - Returned Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePracticeActionsSlice).mockReturnValue(mockActions);
    vi.mocked(usePracticeRefs).mockReturnValue(mockRefs);
    vi.mocked(usePressedKeysState).mockReturnValue(mockPressedKeysState);
  });

  describe('returned structure', () => {
    it('returns state from usePracticeStateSlice', () => {
      const mockState = {
        noteQueue: [
          {
            id: 'note-1',
            midi: 60,
            name: 'C' as const,
            octave: 4,
            frequency: 261.63,
            globalIndex: 0,
          },
        ],
        sessionStats: { totalAttempts: 5, cleanHits: 4, bpm: 120 },
        clef: 'bass' as any,
        practiceRange: 'central' as const,
        handMode: 'right-hand' as const,
        exitingNotes: [],
        detectedNote: {
          id: 'note-2',
          midi: 62,
          name: 'D' as const,
          octave: 4,
          frequency: 293.66,
          globalIndex: 1,
        },
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
      vi.mocked(usePracticeStateSlice).mockReturnValue(defaultMockState);

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
      const mockNote = {
        id: 'note-1',
        midi: 60,
        name: 'C' as const,
        octave: 4,
        frequency: 261.63,
        globalIndex: 0,
      };
      const mockPressedKeys = new Map([[60, { note: mockNote, isCorrect: true }]]);

      vi.mocked(usePressedKeysState).mockReturnValue({
        pressedKeys: mockPressedKeys,
        pressedKeysRef: { current: mockPressedKeys },
        addPressedKey: vi.fn(),
        removePressedKey: vi.fn(),
      });

      vi.mocked(usePracticeStateSlice).mockReturnValue(defaultMockState);

      const { result } = renderHook(() =>
        usePracticeSession({
          onMicError: mockOnMicError,
          onChallengeComplete: mockOnChallengeComplete,
        })
      );

      expect(result.current.pressedKeys).toBe(mockPressedKeys);
      expect(result.current.pressedKeys.size).toBe(1);
      expect(result.current.pressedKeys.get(60)).toEqual({
        note: mockNote,
        isCorrect: true,
      });
    });
  });

  describe('actions delegation', () => {
    it('exposes setPracticeRange from actions slice', () => {
      vi.mocked(usePracticeStateSlice).mockReturnValue(defaultMockState);

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
