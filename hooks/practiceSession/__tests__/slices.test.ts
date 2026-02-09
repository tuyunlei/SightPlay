import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';

import { usePracticeStore } from '../../../store/practiceStore';
import { ClefType } from '../../../types';

import {
  usePracticeStateSlice,
  usePracticeActionsSlice,
  usePracticeRefs,
  usePressedKeysState,
} from '../slices';

beforeEach(() => {
  // Reset store to initial state
  usePracticeStore.setState({
    clef: ClefType.TREBLE,
    practiceRange: 'combined',
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
  });
});

describe('usePracticeStateSlice', () => {
  it('returns all state fields from the store', () => {
    const { result } = renderHook(() => usePracticeStateSlice());

    expect(result.current.clef).toBe(ClefType.TREBLE);
    expect(result.current.practiceRange).toBe('combined');
    expect(result.current.isListening).toBe(false);
    expect(result.current.isMidiConnected).toBe(false);
    expect(result.current.noteQueue).toEqual([]);
    expect(result.current.status).toBe('waiting');
    expect(result.current.score).toBe(0);
    expect(result.current.streak).toBe(0);
    expect(result.current.challengeSequence).toEqual([]);
    expect(result.current.challengeIndex).toBe(0);
    expect(result.current.challengeInfo).toBeNull();
  });

  it('reflects store changes', () => {
    const { result } = renderHook(() => usePracticeStateSlice());

    act(() => {
      usePracticeStore.getState().setClef(ClefType.BASS);
    });

    expect(result.current.clef).toBe(ClefType.BASS);
  });
});

describe('usePracticeActionsSlice', () => {
  it('returns all action functions', () => {
    const { result } = renderHook(() => usePracticeActionsSlice());

    expect(typeof result.current.setClef).toBe('function');
    expect(typeof result.current.setPracticeRange).toBe('function');
    expect(typeof result.current.setIsListening).toBe('function');
    expect(typeof result.current.setIsMidiConnected).toBe('function');
    expect(typeof result.current.setNoteQueue).toBe('function');
    expect(typeof result.current.setExitingNotes).toBe('function');
    expect(typeof result.current.setDetectedNote).toBe('function');
    expect(typeof result.current.setStatus).toBe('function');
    expect(typeof result.current.setScore).toBe('function');
    expect(typeof result.current.setStreak).toBe('function');
    expect(typeof result.current.setSessionStats).toBe('function');
    expect(typeof result.current.setChallengeSequence).toBe('function');
    expect(typeof result.current.setChallengeIndex).toBe('function');
    expect(typeof result.current.setChallengeInfo).toBe('function');
    expect(typeof result.current.resetStats).toBe('function');
  });

  it('actions update the store correctly', () => {
    const { result: actions } = renderHook(() => usePracticeActionsSlice());
    const { result: state } = renderHook(() => usePracticeStateSlice());

    act(() => {
      actions.current.setClef(ClefType.BASS);
      actions.current.setScore(42);
      actions.current.setStreak(5);
      actions.current.setIsListening(true);
      actions.current.setStatus('correct');
    });

    expect(state.current.clef).toBe(ClefType.BASS);
    expect(state.current.score).toBe(42);
    expect(state.current.streak).toBe(5);
    expect(state.current.isListening).toBe(true);
    expect(state.current.status).toBe('correct');
  });

  it('resetStats clears score, streak, and sessionStats', () => {
    const { result: actions } = renderHook(() => usePracticeActionsSlice());

    act(() => {
      actions.current.setScore(100);
      actions.current.setStreak(10);
      actions.current.setSessionStats({ totalAttempts: 50, cleanHits: 40, bpm: 90 });
    });

    act(() => {
      actions.current.resetStats();
    });

    const store = usePracticeStore.getState();
    expect(store.score).toBe(0);
    expect(store.streak).toBe(0);
    expect(store.sessionStats).toEqual({ totalAttempts: 0, cleanHits: 0, bpm: 0 });
  });
});

describe('usePracticeRefs', () => {
  it('returns refs with initial values of 0 and false', () => {
    const { result } = renderHook(() => usePracticeRefs());

    expect(result.current.matchTimer.current).toBe(0);
    expect(result.current.wrongTimer.current).toBe(0);
    expect(result.current.lastHitTime.current).toBe(0);
    expect(result.current.hasMistakeForCurrent.current).toBe(false);
    expect(result.current.isProcessingRef.current).toBe(false);
  });

  it('refs are mutable', () => {
    const { result } = renderHook(() => usePracticeRefs());

    result.current.lastHitTime.current = 12345;
    result.current.hasMistakeForCurrent.current = true;

    expect(result.current.lastHitTime.current).toBe(12345);
    expect(result.current.hasMistakeForCurrent.current).toBe(true);
  });
});

describe('usePressedKeysState', () => {
  it('starts with empty map', () => {
    const { result } = renderHook(() => usePressedKeysState());

    expect(result.current.pressedKeys.size).toBe(0);
  });

  it('adds a pressed key', () => {
    const { result } = renderHook(() => usePressedKeysState());

    const note = { id: '1', name: 'C' as const, octave: 4, frequency: 261.63, midi: 60, globalIndex: 0 };

    act(() => {
      result.current.addPressedKey(60, note, true, 'target-1');
    });

    expect(result.current.pressedKeys.size).toBe(1);
    expect(result.current.pressedKeys.get(60)).toEqual({
      note,
      isCorrect: true,
      targetId: 'target-1',
    });
  });

  it('removes a pressed key and returns its info', () => {
    const { result } = renderHook(() => usePressedKeysState());

    const note = { id: '1', name: 'C' as const, octave: 4, frequency: 261.63, midi: 60, globalIndex: 0 };

    act(() => {
      result.current.addPressedKey(60, note, true);
    });

    let removed: any;
    act(() => {
      removed = result.current.removePressedKey(60);
    });

    expect(removed).toEqual({ note, isCorrect: true, targetId: undefined });
    expect(result.current.pressedKeys.size).toBe(0);
  });

  it('returns null when removing non-existent key', () => {
    const { result } = renderHook(() => usePressedKeysState());

    let removed: any;
    act(() => {
      removed = result.current.removePressedKey(99);
    });

    expect(removed).toBeNull();
  });

  it('keeps pressedKeysRef in sync with state', () => {
    const { result } = renderHook(() => usePressedKeysState());

    const note = { id: '1', name: 'D' as const, octave: 4, frequency: 293.66, midi: 62, globalIndex: 0 };

    act(() => {
      result.current.addPressedKey(62, note, false);
    });

    expect(result.current.pressedKeysRef.current.size).toBe(1);
    expect(result.current.pressedKeysRef.current.get(62)?.isCorrect).toBe(false);
  });

  it('handles multiple keys', () => {
    const { result } = renderHook(() => usePressedKeysState());

    const noteC = { id: '1', name: 'C' as const, octave: 4, frequency: 261.63, midi: 60, globalIndex: 0 };
    const noteE = { id: '2', name: 'E' as const, octave: 4, frequency: 329.63, midi: 64, globalIndex: 1 };

    act(() => {
      result.current.addPressedKey(60, noteC, true);
      result.current.addPressedKey(64, noteE, true);
    });

    expect(result.current.pressedKeys.size).toBe(2);

    act(() => {
      result.current.removePressedKey(60);
    });

    expect(result.current.pressedKeys.size).toBe(1);
    expect(result.current.pressedKeys.has(64)).toBe(true);
  });
});
