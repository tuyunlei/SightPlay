import type { PracticeView } from '@sightplay/practice';

export interface PracticeTestApi {
  getState(): PracticeView;
  simulateMidiNoteOn(midiNumber: number): void;
  simulateMidiNoteOff(midiNumber: number): void;
  getTargetNoteMidi(): number | null;
  getScore(): number;
  getSessionStats(): PracticeView['sessionStats'];
  isReadyForInput(): boolean;
}

declare global {
  interface Window {
    __sightplayTestAPI?: PracticeTestApi;
  }
}

export function registerPracticeTestApi(api: PracticeTestApi): () => void {
  window.__sightplayTestAPI = api;
  return () => {
    if (window.__sightplayTestAPI === api) delete window.__sightplayTestAPI;
  };
}
