export interface PracticeRuntime {
  now: () => number;
  schedule: (delayMs: number, task: () => void) => () => void;
}

export const browserPracticeRuntime: PracticeRuntime = {
  now: () => Date.now(),
  schedule: (delayMs, task) => {
    const timer = window.setTimeout(task, delayMs);
    return () => window.clearTimeout(timer);
  },
};
