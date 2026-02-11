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

describe('usePracticeSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePracticeActionsSlice).mockReturnValue(mockActions);
    vi.mocked(usePracticeRefs).mockReturnValue(mockRefs);
    vi.mocked(usePressedKeysState).mockReturnValue(mockPressedKeysState);
  });

  describe('targetNote calculation', () => {
    it('returns first note from noteQueue when queue is not empty', () => {
      const mockNote = {
        id: 'note-1',
        midi: 60,
        name: 'C' as const,
        octave: 4,
        frequency: 261.63,
        globalIndex: 0,
      };
      vi.mocked(usePracticeStateSlice).mockReturnValue({
        ...defaultMockState,
        noteQueue: [
          mockNote,
          {
            id: 'note-2',
            midi: 64,
            name: 'E' as const,
            octave: 4,
            frequency: 329.63,
            globalIndex: 1,
          },
        ],
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
      vi.mocked(usePracticeStateSlice).mockReturnValue(defaultMockState);

      const { result } = renderHook(() =>
        usePracticeSession({
          onMicError: mockOnMicError,
          onChallengeComplete: mockOnChallengeComplete,
        })
      );

      expect(result.current.derived.targetNote).toBeNull();
    });
  });
});
