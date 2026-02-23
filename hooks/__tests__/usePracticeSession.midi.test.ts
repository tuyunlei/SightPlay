/**
 * P7.3 — Practice Flow MIDI Integration Tests
 *
 * Tests the MIDI → practice session integration at the hook/store level.
 * Renders the real usePracticeSession (no sub-hook mocks), mocks only
 * MidiService (no hardware) and useAudioInput (no mic), then drives
 * MIDI events via __testHandlers and verifies Zustand store state.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { MidiService } from '../../services/midiService';
import { usePracticeStore } from '../../store/practiceStore';
import { ClefType } from '../../types';
import { usePracticeSession } from '../usePracticeSession';

// Prevent MidiService from calling navigator.requestMIDIAccess in jsdom
vi.mock('../../services/midiService');

// Prevent AudioContext / getUserMedia calls from mic integration
vi.mock('../useAudioInput', () => ({
  useAudioInput: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}));

// ─── Types ───────────────────────────────────────────────────────────────────

type TestHandlers = {
  handleMidiNoteOn: (midi: number) => void;
  handleMidiNoteOff: (midi: number) => void;
};

const getTestHandlers = (result: { current: unknown }): TestHandlers =>
  (result.current as { __testHandlers: TestHandlers }).__testHandlers;

// ─── Store reset helper ───────────────────────────────────────────────────────

/** Full initial state matching practiceStore defaults */
const resetStore = () =>
  usePracticeStore.setState({
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
    sessionStats: { totalAttempts: 0, cleanHits: 0, bpm: 0 },
    challengeSequence: [],
    challengeIndex: 0,
    challengeInfo: null,
    practiceMode: 'random',
    currentSongId: null,
    songProgress: 0,
    songTotalNotes: 0,
    songStartTime: null,
  });

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('usePracticeSession — MIDI integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();

    // MidiService mock: silently swallow initialize(), no hardware needed
    vi.mocked(MidiService).mockImplementation(
      () =>
        ({
          initialize: vi.fn().mockResolvedValue(undefined),
        }) as unknown as MidiService
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ── Helper: render and wait for queue ──────────────────────────────────────

  const renderAndWait = async () => {
    const hook = renderHook(() => usePracticeSession({ onMicError: vi.fn() }));

    // useQueueInitialization fires in a useEffect; wait for the queue to fill
    await waitFor(() => {
      expect(usePracticeStore.getState().noteQueue.length).toBeGreaterThan(0);
    });

    return hook;
  };

  // ── Test 1: MIDI Note On → detectedNote updates ────────────────────────────

  it('MIDI Note On sets detectedNote with the correct midi number', async () => {
    const { result } = await renderAndWait();
    const { handleMidiNoteOn } = getTestHandlers(result);

    const testMidi = 60; // middle C — always valid

    act(() => {
      handleMidiNoteOn(testMidi);
    });

    expect(usePracticeStore.getState().detectedNote?.midi).toBe(testMidi);
  });

  // ── Test 2: Correct MIDI note → noteQueue advances ─────────────────────────

  it('playing the correct MIDI note advances the noteQueue to a new first note', async () => {
    const { result } = await renderAndWait();
    const { handleMidiNoteOn, handleMidiNoteOff } = getTestHandlers(result);

    const firstNote = usePracticeStore.getState().noteQueue[0];
    expect(firstNote).toBeDefined();

    act(() => {
      handleMidiNoteOn(firstNote.midi);
      handleMidiNoteOff(firstNote.midi);
    });

    await waitFor(() => {
      const newFirst = usePracticeStore.getState().noteQueue[0];
      expect(newFirst?.id).not.toBe(firstNote.id);
    });
  });

  // ── Test 3: Wrong MIDI note → accuracy < 100% ─────────────────────────────

  it('a wrong note before the correct one results in totalAttempts > cleanHits', async () => {
    const { result } = await renderAndWait();
    const { handleMidiNoteOn, handleMidiNoteOff } = getTestHandlers(result);

    const targetNote = usePracticeStore.getState().noteQueue[0];
    expect(targetNote).toBeDefined();

    // Pick a midi value that is definitely not the target
    const wrongMidi = targetNote.midi !== 60 ? 60 : 61;

    // Play wrong note — hasMistakeForCurrent ref becomes true; note off does
    // NOT call handleCorrectNote because isCorrect=false
    act(() => {
      handleMidiNoteOn(wrongMidi);
      handleMidiNoteOff(wrongMidi);
    });

    // Play correct note — handleCorrectNote fires with hasMistakeForCurrent=true,
    // so cleanHits is NOT incremented but totalAttempts is
    act(() => {
      handleMidiNoteOn(targetNote.midi);
      handleMidiNoteOff(targetNote.midi);
    });

    await waitFor(() => {
      const { totalAttempts, cleanHits } = usePracticeStore.getState().sessionStats;
      expect(totalAttempts).toBeGreaterThan(0);
      // accuracy < 100%: a mistake was recorded so cleanHits < totalAttempts
      expect(cleanHits).toBeLessThan(totalAttempts);
    });
  });

  // ── Test 4: Component rerender → MIDI events still work ───────────────────

  it('MIDI note processing still works correctly after multiple rerenders (ref-freshness regression guard)', async () => {
    const { result, rerender } = await renderAndWait();

    // Force several rerenders — callbacks stored in refs must remain functional
    rerender();
    rerender();
    rerender();

    const { handleMidiNoteOn, handleMidiNoteOff } = getTestHandlers(result);

    // Re-read queue after rerenders (state unchanged)
    const targetNote = usePracticeStore.getState().noteQueue[0];
    expect(targetNote).toBeDefined();
    const originalId = targetNote.id;

    act(() => {
      handleMidiNoteOn(targetNote.midi);
      handleMidiNoteOff(targetNote.midi);
    });

    await waitFor(() => {
      const newFirst = usePracticeStore.getState().noteQueue[0];
      expect(newFirst?.id).not.toBe(originalId);
    });
  });
});
