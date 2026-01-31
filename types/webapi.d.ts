declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }

  interface Navigator {
    requestMIDIAccess?: () => Promise<MIDIAccess>;
  }

  interface MIDIAccess {
    inputs: Map<string, MIDIInput>;
    onstatechange?: (event: MIDIConnectionEvent) => void;
  }

  interface MIDIConnectionEvent {
    port: MIDIInput;
  }

  interface MIDIInput {
    id: string;
    type: 'input' | 'output';
    state: 'connected' | 'disconnected';
    onmidimessage: ((event: MIDIMessageEvent) => void) | null;
  }

  interface MIDIMessageEvent {
    data: Uint8Array;
  }
}

export {};
