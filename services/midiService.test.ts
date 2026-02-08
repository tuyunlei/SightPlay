import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { MidiService } from './midiService';

describe('MidiService', () => {
  let midiService: MidiService;
  let mockMidiAccess: {
    inputs: Map<string, { onmidimessage: ((e: unknown) => void) | null }>;
    onstatechange: ((e: unknown) => void) | null;
  };

  beforeEach(() => {
    midiService = new MidiService();
    mockMidiAccess = {
      inputs: new Map(),
      onstatechange: null,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('requests MIDI access', async () => {
      const requestMIDIAccess = vi.fn().mockResolvedValue(mockMidiAccess);
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn = vi.fn();
      await midiService.initialize(onNoteOn);

      expect(requestMIDIAccess).toHaveBeenCalled();
    });

    it('returns early if MIDI API not available', async () => {
      vi.stubGlobal('navigator', {});

      const onNoteOn = vi.fn();
      await midiService.initialize(onNoteOn);

      // Should not throw
      expect(true).toBe(true);
    });

    it('calls connection change callback with false when no inputs', async () => {
      mockMidiAccess.inputs = new Map();
      const requestMIDIAccess = vi.fn().mockResolvedValue(mockMidiAccess);
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn = vi.fn();
      const onConnectionChange = vi.fn();
      await midiService.initialize(onNoteOn, onConnectionChange);

      expect(onConnectionChange).toHaveBeenCalledWith(false);
    });

    it('calls connection change callback with true when inputs exist', async () => {
      mockMidiAccess.inputs = new Map([['input1', { onmidimessage: null }]]);
      const requestMIDIAccess = vi.fn().mockResolvedValue(mockMidiAccess);
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn = vi.fn();
      const onConnectionChange = vi.fn();
      await midiService.initialize(onNoteOn, onConnectionChange);

      expect(onConnectionChange).toHaveBeenCalledWith(true);
    });

    it('binds message handler to MIDI inputs', async () => {
      const mockInput = { onmidimessage: null };
      mockMidiAccess.inputs = new Map([['input1', mockInput]]);
      const requestMIDIAccess = vi.fn().mockResolvedValue(mockMidiAccess);
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn = vi.fn();
      await midiService.initialize(onNoteOn);

      expect(mockInput.onmidimessage).not.toBeNull();
    });

    it('handles MIDI access error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const requestMIDIAccess = vi.fn().mockRejectedValue(new Error('Access denied'));
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn = vi.fn();
      await midiService.initialize(onNoteOn);

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('does not reinitialize if already initializing', async () => {
      const requestMIDIAccess = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockMidiAccess), 100))
        );
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn = vi.fn();

      // Start two concurrent initializations
      const p1 = midiService.initialize(onNoteOn);
      const p2 = midiService.initialize(onNoteOn);
      await Promise.all([p1, p2]);

      expect(requestMIDIAccess).toHaveBeenCalledTimes(1);
    });

    it('updates callbacks on subsequent calls without reinitializing', async () => {
      const requestMIDIAccess = vi.fn().mockResolvedValue(mockMidiAccess);
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn1 = vi.fn();
      const onNoteOn2 = vi.fn();

      await midiService.initialize(onNoteOn1);
      await midiService.initialize(onNoteOn2);

      expect(requestMIDIAccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('MIDI message handling', () => {
    it('calls onNoteOn for note on messages', async () => {
      const mockInput = { onmidimessage: null as ((e: unknown) => void) | null };
      mockMidiAccess.inputs = new Map([['input1', mockInput]]);
      const requestMIDIAccess = vi.fn().mockResolvedValue(mockMidiAccess);
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn = vi.fn();
      await midiService.initialize(onNoteOn);

      // Simulate note on: channel 1, note 60 (C4), velocity 100
      mockInput.onmidimessage!({ data: [0x90, 60, 100] });

      expect(onNoteOn).toHaveBeenCalledWith(60);
    });

    it('calls onNoteOff for note off messages (0x80)', async () => {
      const mockInput = { onmidimessage: null as ((e: unknown) => void) | null };
      mockMidiAccess.inputs = new Map([['input1', mockInput]]);
      const requestMIDIAccess = vi.fn().mockResolvedValue(mockMidiAccess);
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn = vi.fn();
      const onNoteOff = vi.fn();
      await midiService.initialize(onNoteOn, undefined, onNoteOff);

      // Simulate note off: channel 1, note 60
      mockInput.onmidimessage!({ data: [0x80, 60, 0] });

      expect(onNoteOff).toHaveBeenCalledWith(60);
    });

    it('calls onNoteOff for note on with zero velocity', async () => {
      const mockInput = { onmidimessage: null as ((e: unknown) => void) | null };
      mockMidiAccess.inputs = new Map([['input1', mockInput]]);
      const requestMIDIAccess = vi.fn().mockResolvedValue(mockMidiAccess);
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn = vi.fn();
      const onNoteOff = vi.fn();
      await midiService.initialize(onNoteOn, undefined, onNoteOff);

      // Note on with velocity 0 is treated as note off
      mockInput.onmidimessage!({ data: [0x90, 60, 0] });

      expect(onNoteOff).toHaveBeenCalledWith(60);
      expect(onNoteOn).not.toHaveBeenCalled();
    });

    it('ignores non-note messages', async () => {
      const mockInput = { onmidimessage: null as ((e: unknown) => void) | null };
      mockMidiAccess.inputs = new Map([['input1', mockInput]]);
      const requestMIDIAccess = vi.fn().mockResolvedValue(mockMidiAccess);
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn = vi.fn();
      const onNoteOff = vi.fn();
      await midiService.initialize(onNoteOn, undefined, onNoteOff);

      // Simulate control change message (0xB0)
      mockInput.onmidimessage!({ data: [0xb0, 1, 64] });

      expect(onNoteOn).not.toHaveBeenCalled();
      expect(onNoteOff).not.toHaveBeenCalled();
    });
  });

  describe('hot-plugging', () => {
    it('handles device connection', async () => {
      mockMidiAccess.inputs = new Map();
      const requestMIDIAccess = vi.fn().mockResolvedValue(mockMidiAccess);
      vi.stubGlobal('navigator', { requestMIDIAccess });

      const onNoteOn = vi.fn();
      const onConnectionChange = vi.fn();
      await midiService.initialize(onNoteOn, onConnectionChange);

      // Simulate device connection
      const newInput = { onmidimessage: null };
      mockMidiAccess.inputs.set('input1', newInput);
      mockMidiAccess.onstatechange!({
        port: { type: 'input', state: 'connected', onmidimessage: null },
      });

      expect(onConnectionChange).toHaveBeenCalledWith(true);
    });
  });
});
