import type { PracticePorts } from '@sightplay/practice';

import { createBrowserMicrophoneInput } from './browserMicrophoneInput';
import { createBrowserMidiInput } from './browserMidiInput';

export function createBrowserPracticePorts(): PracticePorts {
  return {
    clock: { now: () => Date.now() },
    scheduler: {
      schedule: (delayMs, task) => {
        const handle = window.setTimeout(task, delayMs);
        return () => window.clearTimeout(handle);
      },
    },
    seed: {
      nextSeed: () => crypto.getRandomValues(new Uint32Array(1))[0],
    },
    midi: createBrowserMidiInput(),
    microphone: createBrowserMicrophoneInput(),
  };
}
