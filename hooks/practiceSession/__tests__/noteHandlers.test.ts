import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createNoteFromMidi } from '../../../domain/note';
import { usePracticeStore } from '../../../store/practiceStore';
import { Note } from '../../../types';
import {
  useDetectedNoteUpdater,
  useHandleCorrectNote,
  useMicNoteHandler,
  useMidiNoteHandlers,
} from '../noteHandlers';
import type { PracticeActions, PracticeRefs } from '../slices';

const makeNote = (midi: number, globalIndex = 0): Note => createNoteFromMidi(midi, globalIndex);

const makeRefs = (): PracticeRefs => ({
  matchTimer: { current: 0 },
  wrongTimer: { current: 0 },
  lastHitTime: { current: Date.now() },
  hasMistakeForCurrent: { current: false },
  isProcessingRef: { current: false },
});

const makeActions = (): PracticeActions => ({
  setClef: vi.fn(),
  setPracticeRange: vi.fn(),
  setHandMode: vi.fn(),
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
});

describe('useDetectedNoteUpdater', () => {
  it('sets note when previous is null', () => {
    const setDetectedNote = vi.fn();
    usePracticeStore.setState({ detectedNote: null });

    const { result } = renderHook(() => useDetectedNoteUpdater(setDetectedNote));
    const note = makeNote(60);
    act(() => result.current(note));

    expect(setDetectedNote).toHaveBeenCalledWith(note);
  });

  it('clears note when called with null and previous exists', () => {
    const setDetectedNote = vi.fn();
    usePracticeStore.setState({ detectedNote: makeNote(60) });

    const { result } = renderHook(() => useDetectedNoteUpdater(setDetectedNote));
    act(() => result.current(null));

    expect(setDetectedNote).toHaveBeenCalledWith(null);
  });

  it('skips update when both null', () => {
    const setDetectedNote = vi.fn();
    usePracticeStore.setState({ detectedNote: null });

    const { result } = renderHook(() => useDetectedNoteUpdater(setDetectedNote));
    act(() => result.current(null));

    expect(setDetectedNote).not.toHaveBeenCalled();
  });

  it('skips update when same midi', () => {
    const setDetectedNote = vi.fn();
    const existing = makeNote(60);
    usePracticeStore.setState({ detectedNote: existing });

    const { result } = renderHook(() => useDetectedNoteUpdater(setDetectedNote));
    act(() => result.current(makeNote(60)));

    expect(setDetectedNote).not.toHaveBeenCalled();
  });

  it('updates when different midi', () => {
    const setDetectedNote = vi.fn();
    usePracticeStore.setState({ detectedNote: makeNote(60) });

    const { result } = renderHook(() => useDetectedNoteUpdater(setDetectedNote));
    const newNote = makeNote(62);
    act(() => result.current(newNote));

    expect(setDetectedNote).toHaveBeenCalledWith(newNote);
  });
});

describe('useHandleCorrectNote', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('processes correct note: updates score, streak, advances queue', () => {
    const target = makeNote(60, 0);
    const next = makeNote(62, 1);
    usePracticeStore.setState({
      noteQueue: [target, next],
      exitingNotes: [],
      score: 0,
      streak: 0,
      sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
      clef: 'treble' as any,
      practiceRange: 'combined',
      challengeSequence: [],
      challengeIndex: 0,
    });

    const actions = makeActions();
    const refs = makeRefs();

    const { result } = renderHook(() => useHandleCorrectNote(actions, refs));
    act(() => result.current());

    expect(actions.setScore).toHaveBeenCalled();
    expect(actions.setStreak).toHaveBeenCalledWith(1);
    expect(actions.setNoteQueue).toHaveBeenCalled();
    expect(actions.setExitingNotes).toHaveBeenCalled();
    expect(actions.setSessionStats).toHaveBeenCalled();
  });

  it('does nothing when processing is locked', () => {
    usePracticeStore.setState({ noteQueue: [makeNote(60)] });
    const actions = makeActions();
    const refs = makeRefs();
    refs.isProcessingRef.current = true;

    const { result } = renderHook(() => useHandleCorrectNote(actions, refs));
    act(() => result.current());

    expect(actions.setScore).not.toHaveBeenCalled();
  });

  it('does nothing when queue is empty', () => {
    usePracticeStore.setState({ noteQueue: [] });
    const actions = makeActions();
    const refs = makeRefs();

    const { result } = renderHook(() => useHandleCorrectNote(actions, refs));
    act(() => result.current());

    expect(actions.setScore).not.toHaveBeenCalled();
  });

  it('calls onChallengeComplete when challenge should complete', () => {
    // Queue has 1 note left, challenge sequence exists
    const target = makeNote(60, 0);
    const challengeNotes = [makeNote(60, 0), makeNote(62, 1)];
    usePracticeStore.setState({
      noteQueue: [target],
      exitingNotes: [],
      score: 0,
      streak: 0,
      sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
      clef: 'treble' as any,
      practiceRange: 'combined',
      challengeSequence: challengeNotes,
      challengeIndex: 1,
    });

    const actions = makeActions();
    const refs = makeRefs();
    const onComplete = vi.fn();

    const { result } = renderHook(() => useHandleCorrectNote(actions, refs, onComplete));
    act(() => result.current());

    expect(onComplete).toHaveBeenCalled();
  });
});

describe('useMicNoteHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when not listening', () => {
    usePracticeStore.setState({ isListening: false, noteQueue: [makeNote(60)] });
    const updateDetected = vi.fn();
    const handleCorrect = vi.fn();
    const refs = makeRefs();

    const { result } = renderHook(() => useMicNoteHandler(updateDetected, handleCorrect, refs));
    act(() => result.current(makeNote(60)));

    expect(handleCorrect).not.toHaveBeenCalled();
  });

  it('triggers correct after match threshold', () => {
    const target = makeNote(60);
    usePracticeStore.setState({ isListening: true, noteQueue: [target] });
    const updateDetected = vi.fn();
    const handleCorrect = vi.fn();
    const refs = makeRefs();

    const { result } = renderHook(() => useMicNoteHandler(updateDetected, handleCorrect, refs));

    // First call sets matchTimer
    act(() => {
      result.current(makeNote(60));
    });
    expect(handleCorrect).not.toHaveBeenCalled();

    // Advance past threshold
    vi.advanceTimersByTime(100);

    act(() => {
      result.current(makeNote(60));
    });
    expect(handleCorrect).toHaveBeenCalled();
  });

  it('marks mistake for wrong note after threshold', () => {
    usePracticeStore.setState({ isListening: true, noteQueue: [makeNote(60)] });
    const updateDetected = vi.fn();
    const handleCorrect = vi.fn();
    const refs = makeRefs();

    const { result } = renderHook(() => useMicNoteHandler(updateDetected, handleCorrect, refs));

    act(() => result.current(makeNote(62)));
    vi.advanceTimersByTime(100);
    act(() => result.current(makeNote(62)));

    expect(refs.hasMistakeForCurrent.current).toBe(true);
    expect(handleCorrect).not.toHaveBeenCalled();
  });

  it('resets timers when null note detected', () => {
    usePracticeStore.setState({ isListening: true, noteQueue: [makeNote(60)] });
    const updateDetected = vi.fn();
    const handleCorrect = vi.fn();
    const refs = makeRefs();

    const { result } = renderHook(() => useMicNoteHandler(updateDetected, handleCorrect, refs));

    // Start matching
    act(() => result.current(makeNote(60)));
    expect(refs.matchTimer.current).not.toBe(0);

    // Null resets
    act(() => result.current(null));
    expect(refs.matchTimer.current).toBe(0);
  });
});

describe('useMidiNoteHandlers', () => {
  it('handles noteOn: sets detected note and adds to pressed keys', () => {
    const target = makeNote(60);
    usePracticeStore.setState({ noteQueue: [target] });

    const setDetectedNote = vi.fn();
    const addPressedKey = vi.fn();
    const removePressedKey = vi.fn();
    const pressedKeysRef = { current: new Map() };
    const handleCorrectNote = vi.fn();
    const refs = makeRefs();

    const { result } = renderHook(() =>
      useMidiNoteHandlers(
        setDetectedNote,
        addPressedKey,
        removePressedKey,
        pressedKeysRef,
        handleCorrectNote,
        refs
      )
    );

    act(() => result.current.handleMidiNoteOn(60));

    expect(setDetectedNote).toHaveBeenCalled();
    expect(addPressedKey).toHaveBeenCalledWith(60, expect.any(Object), true, target.id);
  });

  it('marks mistake for wrong MIDI note', () => {
    usePracticeStore.setState({ noteQueue: [makeNote(60)] });

    const setDetectedNote = vi.fn();
    const addPressedKey = vi.fn();
    const removePressedKey = vi.fn();
    const pressedKeysRef = { current: new Map() };
    const handleCorrectNote = vi.fn();
    const refs = makeRefs();

    const { result } = renderHook(() =>
      useMidiNoteHandlers(
        setDetectedNote,
        addPressedKey,
        removePressedKey,
        pressedKeysRef,
        handleCorrectNote,
        refs
      )
    );

    act(() => result.current.handleMidiNoteOn(62));

    expect(refs.hasMistakeForCurrent.current).toBe(true);
    expect(addPressedKey).toHaveBeenCalledWith(62, expect.any(Object), false, expect.any(String));
  });

  it('handles noteOff: triggers correct when releasing correct key', () => {
    const target = makeNote(60);
    usePracticeStore.setState({ noteQueue: [target] });

    const setDetectedNote = vi.fn();
    const addPressedKey = vi.fn();
    const removePressedKey = vi.fn(() => ({
      note: makeNote(60),
      isCorrect: true,
      targetId: target.id,
    }));
    const pressedKeysRef = { current: new Map() };
    const handleCorrectNote = vi.fn();
    const refs = makeRefs();

    const { result } = renderHook(() =>
      useMidiNoteHandlers(
        setDetectedNote,
        addPressedKey,
        removePressedKey,
        pressedKeysRef,
        handleCorrectNote,
        refs
      )
    );

    act(() => result.current.handleMidiNoteOff(60));

    expect(handleCorrectNote).toHaveBeenCalled();
  });

  it('does not trigger correct when releasing wrong key', () => {
    usePracticeStore.setState({ noteQueue: [makeNote(60)] });

    const setDetectedNote = vi.fn();
    const addPressedKey = vi.fn();
    const removePressedKey = vi.fn(() => ({
      note: makeNote(62),
      isCorrect: false,
      targetId: null,
    }));
    const pressedKeysRef = { current: new Map() };
    const handleCorrectNote = vi.fn();
    const refs = makeRefs();

    const { result } = renderHook(() =>
      useMidiNoteHandlers(
        setDetectedNote,
        addPressedKey,
        removePressedKey,
        pressedKeysRef,
        handleCorrectNote,
        refs
      )
    );

    act(() => result.current.handleMidiNoteOff(62));

    expect(handleCorrectNote).not.toHaveBeenCalled();
  });
});
