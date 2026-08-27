import { observeInstrument } from './observation';
import { createEmptyRoleStats } from './scoring';
import {
  asSessionEpoch,
  type PracticeAction,
  type PracticeState,
  type PracticeTransition,
} from './types';

const emptyStats = { totalAttempts: 0, cleanHits: 0, bpm: 0 } as const;

export function createPracticeState(
  plan: PracticeState['plan'],
  now: number,
  previousEpoch = 0
): PracticeState {
  return {
    epoch: asSessionEpoch(previousEpoch + 1),
    plan,
    cursor: 0,
    startedAt: now,
    lastAcceptedAt: now,
    heldPitches: [],
    matchedFrameId: null,
    detectedPitch: null,
    matchStartedAt: null,
    wrongStartedAt: null,
    hadMistake: false,
    exitingFrames: [],
    status: 'waiting',
    score: 0,
    streak: 0,
    stats: emptyStats,
    roleStats: createEmptyRoleStats(),
    microphone: 'inactive',
    midiConnected: false,
    completion: { kind: 'active' },
    pendingEffects: [],
    nextToken: 0,
  };
}

const unchanged = (state: PracticeState): PracticeTransition => ({ state, effects: [] });

export function transitionPractice(
  state: PracticeState,
  action: PracticeAction
): PracticeTransition {
  if (action.kind === 'exerciseStarted') {
    return { state: createPracticeState(action.plan, action.now, state.epoch), effects: [] };
  }
  if (action.kind === 'statsReset') {
    return {
      state: {
        ...state,
        score: 0,
        streak: 0,
        stats: emptyStats,
        roleStats: createEmptyRoleStats(),
        lastAcceptedAt: action.now,
      },
      effects: [],
    };
  }
  if (action.kind === 'microphoneStartRequested') return requestMicrophone(state);
  if (action.kind === 'microphoneStarted') {
    if (state.microphone !== 'starting') return unchanged(state);
    return { state: { ...state, microphone: 'listening', status: 'listening' }, effects: [] };
  }
  if (action.kind === 'microphoneStartFailed') {
    if (state.microphone !== 'starting') return unchanged(state);
    const stopped = stopMicrophone(state);
    return {
      state: stopped.state,
      effects: [{ kind: 'microphoneFailed', epoch: state.epoch }],
    };
  }
  if (action.kind === 'microphoneStopped') {
    return stopMicrophone(state);
  }
  if (action.kind === 'effectElapsed') return applyElapsedEffect(state, action);
  return observeInstrument(state, action.observation);
}

function requestMicrophone(state: PracticeState): PracticeTransition {
  if (state.microphone === 'starting') return unchanged(state);
  if (state.microphone === 'listening') {
    return {
      state: { ...state, microphone: 'inactive', detectedPitch: null, status: 'waiting' },
      effects: [{ kind: 'stopMicrophone', epoch: state.epoch }],
    };
  }
  return {
    state: { ...state, microphone: 'starting' },
    effects: [{ kind: 'startMicrophone', epoch: state.epoch }],
  };
}

function stopMicrophone(state: PracticeState): PracticeTransition {
  return {
    state: {
      ...state,
      microphone: 'inactive',
      detectedPitch: null,
      matchStartedAt: null,
      wrongStartedAt: null,
      status: 'waiting',
    },
    effects: [],
  };
}

function applyElapsedEffect(
  state: PracticeState,
  action: Extract<PracticeAction, { kind: 'effectElapsed' }>
): PracticeTransition {
  if (action.epoch !== state.epoch) return unchanged(state);
  const pending = state.pendingEffects.find(
    (item) => item.token === action.token && item.effect === action.effect
  );
  if (!pending) return unchanged(state);
  const pendingEffects = state.pendingEffects.filter((item) => item !== pending);
  if (pending.effect === 'exitCleanup') {
    return {
      state: {
        ...state,
        pendingEffects,
        exitingFrames: state.exitingFrames.filter((frame) => frame.id !== pending.frameId),
        status: state.microphone === 'listening' ? 'listening' : 'waiting',
      },
      effects: [],
    };
  }
  return {
    state: {
      ...state,
      pendingEffects,
      completion: { kind: 'completed', completedAt: action.now },
    },
    effects: [
      {
        kind: 'exerciseCompleted',
        epoch: state.epoch,
        plan: state.plan,
        score: state.score,
        streak: state.streak,
        stats: state.stats,
        completedAt: action.now,
      },
    ],
  };
}
