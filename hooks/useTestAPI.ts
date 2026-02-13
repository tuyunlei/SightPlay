import { useEffect } from 'react';

import { registerTestAPI } from '../services/testHelpers';

import type { usePracticeSession } from './usePracticeSession';

type PracticeSessionWithTestHandlers = ReturnType<typeof usePracticeSession> & {
  __testHandlers?: {
    handleMidiNoteOn: (midi: number) => void;
    handleMidiNoteOff: (midi: number) => void;
  };
};

/**
 * Register test API for E2E tests (dev/test mode only)
 * This hook exposes internal MIDI handlers and state accessors
 * to window.__sightplayTestAPI for Playwright E2E tests
 */
export function useTestAPI(practiceSession: PracticeSessionWithTestHandlers) {
  const { state, derived } = practiceSession;

  useEffect(() => {
    if (
      (import.meta.env.MODE === 'test' || import.meta.env.DEV) &&
      practiceSession.__testHandlers
    ) {
      const testHandlers = practiceSession.__testHandlers;
      registerTestAPI({
        getState: () => state,
        simulateMidiNoteOn: testHandlers.handleMidiNoteOn,
        simulateMidiNoteOff: testHandlers.handleMidiNoteOff,
        getTargetNoteMidi: () => derived.targetNote?.midi ?? null,
        getScore: () => state.score,
        getSessionStats: () => state.sessionStats,
      });
    }
  }, [state, derived, practiceSession]);
}
