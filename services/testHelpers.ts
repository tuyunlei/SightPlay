/**
 * Test helpers for E2E testing
 * Only available in test/development mode
 */

import type { usePracticeSession } from '../hooks/usePracticeSession';

type PracticeSessionReturn = ReturnType<typeof usePracticeSession>;

interface TestAPI {
  /**
   * Get the current practice session state
   */
  getState: () => PracticeSessionReturn['state'];

  /**
   * Simulate MIDI note on (key press)
   */
  simulateMidiNoteOn: (midiNumber: number) => void;

  /**
   * Simulate MIDI note off (key release)
   */
  simulateMidiNoteOff: (midiNumber: number) => void;

  /**
   * Get the current target note MIDI number
   */
  getTargetNoteMidi: () => number | null;

  /**
   * Get current score
   */
  getScore: () => number;

  /**
   * Get session stats
   */
  getSessionStats: () => {
    totalAttempts: number;
    cleanHits: number;
    bpm: number;
  };
}

/**
 * Global test API registry
 * Set by the App component when test mode is enabled
 */
let testAPI: TestAPI | null = null;

/**
 * Register the test API for E2E tests
 * Call this from your App component in test/dev mode
 */
declare global {
  interface Window {
    __sightplayTestAPI?: TestAPI;
  }
}

export function registerTestAPI(api: TestAPI) {
  testAPI = api;
  if (typeof window !== 'undefined') {
    window.__sightplayTestAPI = api;
  }
}

/**
 * Get the test API (for internal use)
 */
export function getTestAPI(): TestAPI | null {
  return testAPI;
}

/**
 * Check if test mode is enabled
 */
export function isTestMode(): boolean {
  return import.meta.env.MODE === 'test' || import.meta.env.DEV;
}
