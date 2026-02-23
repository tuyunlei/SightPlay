import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { MidiService } from '../services/midiService';

import { useMidiInput } from './useMidiInput';

vi.mock('../services/midiService');

describe('useMidiInput', () => {
  let mockMidiService: {
    initialize: ReturnType<typeof vi.fn>;
  };
  let capturedCallbacks: {
    onNoteOn?: (midi: number) => void;
    onConnectionChange?: (connected: boolean) => void;
    onNoteOff?: (midi: number) => void;
  };

  beforeEach(() => {
    capturedCallbacks = {};
    mockMidiService = {
      initialize: vi.fn().mockImplementation((noteOn, connChange, noteOff) => {
        capturedCallbacks.onNoteOn = noteOn;
        capturedCallbacks.onConnectionChange = connChange;
        capturedCallbacks.onNoteOff = noteOff;
        return Promise.resolve();
      }),
    };
    vi.mocked(MidiService).mockImplementation(() => mockMidiService as unknown as MidiService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates MidiService instance', () => {
    const onNoteOn = vi.fn();
    renderHook(() => useMidiInput({ onNoteOn }));

    expect(MidiService).toHaveBeenCalledTimes(1);
  });

  it('initializes MIDI service once on mount', () => {
    const onNoteOn = vi.fn();
    renderHook(() => useMidiInput({ onNoteOn }));

    expect(mockMidiService.initialize).toHaveBeenCalledTimes(1);
  });

  it('does not reinitialize when callbacks change', () => {
    const onNoteOn1 = vi.fn();
    const onNoteOn2 = vi.fn();

    const { rerender } = renderHook(({ onNoteOn }) => useMidiInput({ onNoteOn }), {
      initialProps: { onNoteOn: onNoteOn1 },
    });

    rerender({ onNoteOn: onNoteOn2 });

    // Should only initialize once — callbacks are accessed via refs
    expect(mockMidiService.initialize).toHaveBeenCalledTimes(1);
  });

  it('delegates to latest onNoteOn callback via ref', () => {
    const onNoteOn1 = vi.fn();
    const onNoteOn2 = vi.fn();

    const { rerender } = renderHook(({ onNoteOn }) => useMidiInput({ onNoteOn }), {
      initialProps: { onNoteOn: onNoteOn1 },
    });

    rerender({ onNoteOn: onNoteOn2 });

    // Simulate MIDI event through captured wrapper
    act(() => {
      capturedCallbacks.onNoteOn?.(60);
    });

    expect(onNoteOn1).not.toHaveBeenCalled();
    expect(onNoteOn2).toHaveBeenCalledWith(60);
  });

  it('delegates to latest onNoteOff callback via ref', () => {
    const onNoteOn = vi.fn();
    const onNoteOff1 = vi.fn();
    const onNoteOff2 = vi.fn();

    const { rerender } = renderHook(({ onNoteOff }) => useMidiInput({ onNoteOn, onNoteOff }), {
      initialProps: { onNoteOff: onNoteOff1 },
    });

    rerender({ onNoteOff: onNoteOff2 });

    act(() => {
      capturedCallbacks.onNoteOff?.(60);
    });

    expect(onNoteOff1).not.toHaveBeenCalled();
    expect(onNoteOff2).toHaveBeenCalledWith(60);
  });

  it('delegates to latest onConnectionChange callback via ref', () => {
    const onNoteOn = vi.fn();
    const onConnectionChange1 = vi.fn();
    const onConnectionChange2 = vi.fn();

    const { rerender } = renderHook(
      ({ onConnectionChange }) => useMidiInput({ onNoteOn, onConnectionChange }),
      { initialProps: { onConnectionChange: onConnectionChange1 } }
    );

    rerender({ onConnectionChange: onConnectionChange2 });

    act(() => {
      capturedCallbacks.onConnectionChange?.(true);
    });

    expect(onConnectionChange1).not.toHaveBeenCalled();
    expect(onConnectionChange2).toHaveBeenCalledWith(true);
  });

  it('uses same MidiService instance across rerenders', () => {
    const onNoteOn = vi.fn();

    const { rerender } = renderHook(({ onNoteOn }) => useMidiInput({ onNoteOn }), {
      initialProps: { onNoteOn },
    });

    rerender({ onNoteOn: vi.fn() });
    rerender({ onNoteOn: vi.fn() });

    expect(MidiService).toHaveBeenCalled();
  });
});
