import type { GuidancePorts } from '@sightplay/guidance';

import { createHttpGuidanceChat } from './httpGuidanceChat';

export function createBrowserGuidancePorts(): GuidancePorts {
  return {
    chat: createHttpGuidanceChat(),
    clock: { now: () => Date.now() },
    scheduler: {
      schedule: (delayMs, task) => {
        const handle = window.setTimeout(task, delayMs);
        return () => window.clearTimeout(handle);
      },
    },
  };
}
