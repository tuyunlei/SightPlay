import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MidiInputPort, useMidiInput } from './useMidiInput';

describe('useMidiInput', () => {
  let service: MidiInputPort;
  let callbacks: {
    noteOn?: (midi: number) => void;
    noteOff?: (midi: number) => void;
    connection?: (connected: boolean) => void;
  };

  beforeEach(() => {
    callbacks = {};
    service = {
      initialize: vi.fn(async (noteOn, connection, noteOff) => {
        callbacks = { noteOn, connection, noteOff };
      }),
    };
  });

  it('initializes the injected MIDI service once across rerenders', () => {
    const { rerender } = renderHook(
      ({ onNoteOn }) => useMidiInput({ onNoteOn, createService: () => service }),
      { initialProps: { onNoteOn: vi.fn() } }
    );

    rerender({ onNoteOn: vi.fn() });

    expect(service.initialize).toHaveBeenCalledOnce();
  });

  it('delivers note-on events to the latest callback', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = renderHook(
      ({ onNoteOn }) => useMidiInput({ onNoteOn, createService: () => service }),
      { initialProps: { onNoteOn: first } }
    );

    rerender({ onNoteOn: latest });
    act(() => callbacks.noteOn?.(60));

    expect(latest).toHaveBeenCalledWith(60);
    expect(first).not.toHaveBeenCalled();
  });

  it('delivers note-off and connection events through their public callbacks', () => {
    const onNoteOff = vi.fn();
    const onConnectionChange = vi.fn();
    renderHook(() =>
      useMidiInput({
        onNoteOn: vi.fn(),
        onNoteOff,
        onConnectionChange,
        createService: () => service,
      })
    );

    act(() => {
      callbacks.noteOff?.(61);
      callbacks.connection?.(true);
    });

    expect(onNoteOff).toHaveBeenCalledWith(61);
    expect(onConnectionChange).toHaveBeenCalledWith(true);
  });
});
