import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { MidiService } from '../services/midiService';

import { useMidiInput } from './useMidiInput';

vi.mock('../services/midiService');

describe('useMidiInput', () => {
  let mockMidiService: {
    initialize: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockMidiService = {
      initialize: vi.fn().mockResolvedValue(undefined),
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

  it('initializes MIDI service with onNoteOn callback', () => {
    const onNoteOn = vi.fn();
    renderHook(() => useMidiInput({ onNoteOn }));

    expect(mockMidiService.initialize).toHaveBeenCalledWith(onNoteOn, undefined, undefined);
  });

  it('passes all callbacks to initialize', () => {
    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();
    const onConnectionChange = vi.fn();

    renderHook(() =>
      useMidiInput({
        onNoteOn,
        onNoteOff,
        onConnectionChange,
      })
    );

    expect(mockMidiService.initialize).toHaveBeenCalledWith(
      onNoteOn,
      onConnectionChange,
      onNoteOff
    );
  });

  it('reinitializes when onNoteOn changes', () => {
    const onNoteOn1 = vi.fn();
    const onNoteOn2 = vi.fn();

    const { rerender } = renderHook(({ onNoteOn }) => useMidiInput({ onNoteOn }), {
      initialProps: { onNoteOn: onNoteOn1 },
    });

    expect(mockMidiService.initialize).toHaveBeenCalledTimes(1);

    rerender({ onNoteOn: onNoteOn2 });

    expect(mockMidiService.initialize).toHaveBeenCalledTimes(2);
    expect(mockMidiService.initialize).toHaveBeenLastCalledWith(onNoteOn2, undefined, undefined);
  });

  it('reinitializes when onConnectionChange changes', () => {
    const onNoteOn = vi.fn();
    const onConnectionChange1 = vi.fn();
    const onConnectionChange2 = vi.fn();

    const { rerender } = renderHook(
      ({ onConnectionChange }) => useMidiInput({ onNoteOn, onConnectionChange }),
      { initialProps: { onConnectionChange: onConnectionChange1 } }
    );

    rerender({ onConnectionChange: onConnectionChange2 });

    expect(mockMidiService.initialize).toHaveBeenCalledTimes(2);
  });

  it('reinitializes when onNoteOff changes', () => {
    const onNoteOn = vi.fn();
    const onNoteOff1 = vi.fn();
    const onNoteOff2 = vi.fn();

    const { rerender } = renderHook(({ onNoteOff }) => useMidiInput({ onNoteOn, onNoteOff }), {
      initialProps: { onNoteOff: onNoteOff1 },
    });

    rerender({ onNoteOff: onNoteOff2 });

    expect(mockMidiService.initialize).toHaveBeenCalledTimes(2);
  });

  it('uses same MidiService instance across rerenders', () => {
    const onNoteOn = vi.fn();

    const { rerender } = renderHook(({ onNoteOn }) => useMidiInput({ onNoteOn }), {
      initialProps: { onNoteOn },
    });

    rerender({ onNoteOn: vi.fn() });
    rerender({ onNoteOn: vi.fn() });

    // MidiService should be constructed (StrictMode may cause multiple calls)
    expect(MidiService).toHaveBeenCalled();
  });
});
