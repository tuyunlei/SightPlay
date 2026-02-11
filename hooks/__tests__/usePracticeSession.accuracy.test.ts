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

import { computeAccuracy } from '../../domain/scoring';
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

describe('usePracticeSession - Accuracy Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePracticeActionsSlice).mockReturnValue(mockActions);
    vi.mocked(usePracticeRefs).mockReturnValue(mockRefs);
    vi.mocked(usePressedKeysState).mockReturnValue(mockPressedKeysState);
  });

  describe('accuracy calculation', () => {
    it('computes accuracy from sessionStats', () => {
      vi.mocked(usePracticeStateSlice).mockReturnValue({
        ...defaultMockState,
        sessionStats: { totalAttempts: 10, cleanHits: 7, bpm: 60 },
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
      vi.mocked(usePracticeStateSlice).mockReturnValue(defaultMockState);

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
            ...defaultMockState,
            sessionStats: stats,
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
});
