import { useEffect } from 'react';

import type { PracticeClient } from '@sightplay/practice';

import { registerPracticeTestApi } from '../app/testing/registerPracticeTestApi';

/**
 * Register test API for E2E tests (dev/test mode only)
 * This hook exposes internal MIDI handlers and state accessors
 * to window.__sightplayTestAPI for Playwright E2E tests
 */
export function useTestAPI(practice: PracticeClient) {
  const { view } = practice;

  useEffect(() => {
    if (import.meta.env.MODE !== 'test' && !import.meta.env.DEV) return;
    return registerPracticeTestApi({
      getState: () => view,
      simulateMidiNoteOn: practice.simulateMidiPressed,
      simulateMidiNoteOff: practice.simulateMidiReleased,
      getTargetNoteMidi: () => view.targetNote?.midi ?? null,
      getScore: () => view.score,
      getSessionStats: () => view.sessionStats,
      isReadyForInput: practice.canAcceptInput,
    });
  }, [practice, view]);
}
