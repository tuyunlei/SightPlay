import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MidiService } from '../midiService';

function setRequestMIDIAccess(fn: (() => Promise<MIDIAccess>) | undefined) {
  Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', {
    configurable: true,
    writable: true,
    value: fn,
  });
}

function createMockMIDIInput(id: string): {
  input: MIDIInput;
  simulateMessage: (data: number[] | null) => void;
} {
  const input = {
    id,
    type: 'input',
    state: 'connected',
    onmidimessage: null,
  } as unknown as MIDIInput;

  const simulateMessage = (data: number[] | null) => {
    input.onmidimessage?.({ data } as MIDIMessageEvent);
  };

  return { input, simulateMessage };
}

function createMockMIDIAccess(inputs: Map<string, MIDIInput>): {
  access: MIDIAccess;
  simulateConnect: (input: MIDIInput) => void;
} {
  const access = {
    inputs,
    onstatechange: null,
  } as unknown as MIDIAccess;

  const simulateConnect = (input: MIDIInput) => {
    inputs.set(input.id, input);
    access.onstatechange?.({ port: input } as unknown as MIDIConnectionEvent);
  };

  return { access, simulateConnect };
}

describe('MidiService integration (WebMIDI API mock)', () => {
  beforeEach(() => {
    setRequestMIDIAccess(undefined);
  });

  it('Device connection: initialize() reports connected when inputs exist', async () => {
    const { input } = createMockMIDIInput('input-1');
    const { access } = createMockMIDIAccess(new Map([[input.id, input]]));
    const requestMIDIAccess = vi.fn().mockResolvedValue(access);
    setRequestMIDIAccess(requestMIDIAccess as unknown as () => Promise<MIDIAccess>);

    const service = new MidiService();
    const onConnectionChange = vi.fn();

    await service.initialize(vi.fn(), onConnectionChange, vi.fn());

    expect(onConnectionChange).toHaveBeenCalledWith(true);
  });

  it('No device: initialize() reports disconnected when inputs map is empty', async () => {
    const { access } = createMockMIDIAccess(new Map());
    const requestMIDIAccess = vi.fn().mockResolvedValue(access);
    setRequestMIDIAccess(requestMIDIAccess as unknown as () => Promise<MIDIAccess>);

    const service = new MidiService();
    const onConnectionChange = vi.fn();

    await service.initialize(vi.fn(), onConnectionChange, vi.fn());

    expect(onConnectionChange).toHaveBeenCalledWith(false);
  });

  it('Note On: [0x90, 60, 127] triggers onNoteOn(60)', async () => {
    const { input, simulateMessage } = createMockMIDIInput('input-1');
    const { access } = createMockMIDIAccess(new Map([[input.id, input]]));
    const requestMIDIAccess = vi.fn().mockResolvedValue(access);
    setRequestMIDIAccess(requestMIDIAccess as unknown as () => Promise<MIDIAccess>);

    const service = new MidiService();
    const onNoteOn = vi.fn();

    await service.initialize(onNoteOn, vi.fn(), vi.fn());
    simulateMessage([0x90, 60, 127]);

    expect(onNoteOn).toHaveBeenCalledWith(60);
  });

  it('Note Off (0x80): [0x80, 60, 0] triggers onNoteOff(60)', async () => {
    const { input, simulateMessage } = createMockMIDIInput('input-1');
    const { access } = createMockMIDIAccess(new Map([[input.id, input]]));
    const requestMIDIAccess = vi.fn().mockResolvedValue(access);
    setRequestMIDIAccess(requestMIDIAccess as unknown as () => Promise<MIDIAccess>);

    const service = new MidiService();
    const onNoteOff = vi.fn();

    await service.initialize(vi.fn(), vi.fn(), onNoteOff);
    simulateMessage([0x80, 60, 0]);

    expect(onNoteOff).toHaveBeenCalledWith(60);
  });

  it('Note Off via velocity 0: [0x90, 60, 0] triggers onNoteOff(60)', async () => {
    const { input, simulateMessage } = createMockMIDIInput('input-1');
    const { access } = createMockMIDIAccess(new Map([[input.id, input]]));
    const requestMIDIAccess = vi.fn().mockResolvedValue(access);
    setRequestMIDIAccess(requestMIDIAccess as unknown as () => Promise<MIDIAccess>);

    const service = new MidiService();
    const onNoteOff = vi.fn();

    await service.initialize(vi.fn(), vi.fn(), onNoteOff);
    simulateMessage([0x90, 60, 0]);

    expect(onNoteOff).toHaveBeenCalledWith(60);
  });

  it('Hot-plug: onstatechange connected input auto-binds and handles messages', async () => {
    const { access, simulateConnect } = createMockMIDIAccess(new Map());
    const requestMIDIAccess = vi.fn().mockResolvedValue(access);
    setRequestMIDIAccess(requestMIDIAccess as unknown as () => Promise<MIDIAccess>);

    const service = new MidiService();
    const onNoteOn = vi.fn();

    await service.initialize(onNoteOn, vi.fn(), vi.fn());

    const { input, simulateMessage } = createMockMIDIInput('hot-plug-1');
    simulateConnect(input);
    simulateMessage([0x90, 64, 100]);

    expect(onNoteOn).toHaveBeenCalledWith(64);
  });

  it('Callback freshness: second initialize updates callbacks without new MIDIAccess', async () => {
    const { input, simulateMessage } = createMockMIDIInput('input-1');
    const { access } = createMockMIDIAccess(new Map([[input.id, input]]));
    const requestMIDIAccess = vi.fn().mockResolvedValue(access);
    setRequestMIDIAccess(requestMIDIAccess as unknown as () => Promise<MIDIAccess>);

    const service = new MidiService();
    const firstOnNoteOn = vi.fn();
    const secondOnNoteOn = vi.fn();

    await service.initialize(firstOnNoteOn, vi.fn(), vi.fn());
    await service.initialize(secondOnNoteOn, vi.fn(), vi.fn());

    simulateMessage([0x90, 67, 127]);

    expect(requestMIDIAccess).toHaveBeenCalledTimes(1);
    expect(firstOnNoteOn).not.toHaveBeenCalled();
    expect(secondOnNoteOn).toHaveBeenCalledWith(67);
  });

  it('No data in message: event.data null does not crash or call callbacks', async () => {
    const { input, simulateMessage } = createMockMIDIInput('input-1');
    const { access } = createMockMIDIAccess(new Map([[input.id, input]]));
    const requestMIDIAccess = vi.fn().mockResolvedValue(access);
    setRequestMIDIAccess(requestMIDIAccess as unknown as () => Promise<MIDIAccess>);

    const service = new MidiService();
    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();

    await service.initialize(onNoteOn, vi.fn(), onNoteOff);

    expect(() => simulateMessage(null)).not.toThrow();
    expect(onNoteOn).not.toHaveBeenCalled();
    expect(onNoteOff).not.toHaveBeenCalled();
  });

  it('requestMIDIAccess unavailable: initialize() exits without crash', async () => {
    setRequestMIDIAccess(undefined);
    const service = new MidiService();

    await expect(service.initialize(vi.fn(), vi.fn(), vi.fn())).resolves.toBeUndefined();
  });
});
