import { describe, expect, it, vi } from 'vitest';

import { createBrowserMidiInput } from './browserMidiInput';

function midiFixture() {
  const input = { onmidimessage: null as ((event: MIDIMessageEvent) => void) | null };
  const access = {
    inputs: new Map([['keyboard', input]]),
    onstatechange: null as ((event: MIDIConnectionEvent) => void) | null,
  };
  return { input, access: access as unknown as MIDIAccess };
}

describe('browser MIDI input lifecycle', () => {
  it('normalizes note messages and hot-plug state into signals', async () => {
    const fixture = midiFixture();
    const observer = vi.fn();
    const port = createBrowserMidiInput({ requestAccess: async () => fixture.access });

    await port.start(observer);
    fixture.input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 100]) } as MIDIMessageEvent);
    fixture.input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 0]) } as MIDIMessageEvent);

    expect(observer.mock.calls.map(([signal]) => signal.kind)).toEqual([
      'connectionChanged',
      'pressed',
      'released',
    ]);
  });

  it('removes every browser callback and rejects late access after disposal', async () => {
    const fixture = midiFixture();
    let resolveAccess!: (access: MIDIAccess) => void;
    const pending = new Promise<MIDIAccess>((resolve) => {
      resolveAccess = resolve;
    });
    const observer = vi.fn();
    const port = createBrowserMidiInput({ requestAccess: () => pending });
    const started = port.start(observer);
    port.dispose();
    resolveAccess(fixture.access);
    await started;

    expect(fixture.input.onmidimessage).toBeNull();
    expect(fixture.access.onstatechange).toBeNull();
    expect(observer).not.toHaveBeenCalled();

    await port.start(observer);
    port.dispose();
    expect(fixture.input.onmidimessage).toBeNull();
    expect(fixture.access.onstatechange).toBeNull();
  });
});
