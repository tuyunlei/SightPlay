import { createMidiPitch, type MidiInputPort, type MidiInputSignal } from '@sightplay/practice';

export interface BrowserMidiEnvironment {
  requestAccess?: () => Promise<MIDIAccess>;
}

export function createBrowserMidiInput(
  environment: BrowserMidiEnvironment = {
    requestAccess: navigator.requestMIDIAccess?.bind(navigator),
  }
): MidiInputPort {
  let generation = 0;
  let access: MIDIAccess | null = null;
  let observer: ((signal: MidiInputSignal) => void) | null = null;

  const clearBindings = () => {
    if (!access) return;
    access.onstatechange = null;
    access.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
    access = null;
  };

  const dispose = () => {
    generation += 1;
    observer = null;
    clearBindings();
  };

  const start = async (nextObserver: (signal: MidiInputSignal) => void) => {
    dispose();
    const currentGeneration = generation;
    observer = nextObserver;
    if (!environment.requestAccess) {
      observer({ kind: 'connectionChanged', connected: false });
      return;
    }
    const nextAccess = await environment.requestAccess();
    if (generation !== currentGeneration) return;
    access = nextAccess;
    bindInputs(access, emitMessage);
    emitConnection();
    access.onstatechange = () => {
      if (generation !== currentGeneration || !access) return;
      bindInputs(access, emitMessage);
      emitConnection();
    };
  };

  const emitConnection = () => {
    observer?.({ kind: 'connectionChanged', connected: (access?.inputs.size ?? 0) > 0 });
  };

  const emitMessage = (event: MIDIMessageEvent) => {
    const data = event.data;
    if (!data || data.length < 3) return;
    const [command, value, velocity] = data;
    const pitch = createMidiPitch(value);
    if (pitch === null) return;
    const commandType = command & 0xf0;
    if (commandType === 0x90 && velocity > 0) observer?.({ kind: 'pressed', pitch });
    if (commandType === 0x80 || (commandType === 0x90 && velocity === 0)) {
      observer?.({ kind: 'released', pitch });
    }
  };

  return { start, dispose };
}

function bindInputs(access: MIDIAccess, observer: (event: MIDIMessageEvent) => void): void {
  access.inputs.forEach((input) => {
    input.onmidimessage = observer;
  });
}
