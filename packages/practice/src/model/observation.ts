import { frameAt } from './exercise';
import { acceptAttempt, acceptRoleAttempt, computeScore } from './scoring';
import {
  asEffectToken,
  type HeldPitch,
  type InstrumentObservation,
  type MidiPitch,
  type PracticeEffect,
  type PracticeState,
  type PracticeTransition,
  type ScoreFrame,
} from './types';

const MATCH_THRESHOLD_MS = 80;
const EXIT_CLEANUP_MS = 600;
const COMPLETION_DELAY_MS = 1_000;
const unchanged = (state: PracticeState): PracticeTransition => ({ state, effects: [] });

export function observeInstrument(
  state: PracticeState,
  observation: InstrumentObservation
): PracticeTransition {
  if (observation.kind === 'midiConnectionChanged') {
    return { state: { ...state, midiConnected: observation.connected }, effects: [] };
  }
  if (state.completion.kind !== 'active') {
    return unchanged(state);
  }
  if (observation.kind === 'microphonePitch') return observeMicrophone(state, observation);
  return observation.kind === 'midiPressed'
    ? pressMidi(state, observation.pitch)
    : releaseMidi(state, observation.pitch, observation.at);
}

function pressMidi(state: PracticeState, pitch: MidiPitch): PracticeTransition {
  const target = frameAt(state.plan, state.cursor);
  if (!target) return unchanged(state);
  const matchesTarget = target.pitches.includes(pitch);
  const heldPitches = replaceHeldPitch(state.heldPitches, { pitch, matchesTarget });
  const matchesFrame = target.pitches.every((targetPitch) =>
    heldPitches.some((held) => held.pitch === targetPitch)
  );
  return {
    state: {
      ...state,
      heldPitches,
      matchedFrameId: matchesFrame ? target.id : state.matchedFrameId,
      detectedPitch: pitch,
      hadMistake: state.hadMistake || !matchesTarget,
      status: matchesTarget ? state.status : 'incorrect',
    },
    effects: [],
  };
}

function replaceHeldPitch(held: readonly HeldPitch[], next: HeldPitch): readonly HeldPitch[] {
  return [...held.filter((item) => item.pitch !== next.pitch), next];
}

function releaseMidi(state: PracticeState, pitch: MidiPitch, at: number): PracticeTransition {
  const target = frameAt(state.plan, state.cursor);
  const heldPitches = state.heldPitches.filter((held) => held.pitch !== pitch);
  const shouldAccept =
    target !== null && state.matchedFrameId === target.id && target.pitches.includes(pitch);
  if (shouldAccept) return acceptTarget({ ...state, heldPitches }, target, at);
  return {
    state: {
      ...state,
      heldPitches,
      detectedPitch: heldPitches.at(-1)?.pitch ?? null,
    },
    effects: [],
  };
}

function observeMicrophone(
  state: PracticeState,
  observation: Extract<InstrumentObservation, { kind: 'microphonePitch' }>
): PracticeTransition {
  if (state.microphone !== 'listening') return unchanged(state);
  const target = frameAt(state.plan, state.cursor);
  if (!target || target.pitches.length !== 1) return unchanged(state);
  if (observation.pitch === null) {
    return {
      state: {
        ...state,
        detectedPitch: null,
        matchStartedAt: null,
        wrongStartedAt: null,
        status: 'listening',
      },
      effects: [],
    };
  }
  return observation.pitch === target.pitches[0]
    ? observeMatchingMicrophone(state, target, observation.pitch, observation.at)
    : observeWrongMicrophone(state, observation.pitch, observation.at);
}

function observeMatchingMicrophone(
  state: PracticeState,
  target: ScoreFrame,
  pitch: MidiPitch,
  at: number
): PracticeTransition {
  const startedAt = state.matchStartedAt ?? at;
  if (at - startedAt >= MATCH_THRESHOLD_MS) return acceptTarget(state, target, at);
  return {
    state: {
      ...state,
      detectedPitch: pitch,
      matchStartedAt: startedAt,
      wrongStartedAt: null,
      status: 'listening',
    },
    effects: [],
  };
}

function observeWrongMicrophone(
  state: PracticeState,
  pitch: MidiPitch,
  at: number
): PracticeTransition {
  const startedAt = state.wrongStartedAt ?? at;
  return {
    state: {
      ...state,
      detectedPitch: pitch,
      matchStartedAt: null,
      wrongStartedAt: startedAt,
      hadMistake: state.hadMistake || at - startedAt >= MATCH_THRESHOLD_MS,
      status: at - startedAt >= MATCH_THRESHOLD_MS ? 'incorrect' : state.status,
    },
    effects: [],
  };
}

function acceptTarget(state: PracticeState, target: ScoreFrame, at: number): PracticeTransition {
  const nextCursor = state.cursor + 1;
  const score = computeScore(state.score, state.streak);
  const streak = state.streak + 1;
  const stats = acceptAttempt(state.stats, state.hadMistake, at - state.lastAcceptedAt);
  const roleStats = acceptRoleAttempt(state.roleStats, target.role, state.hadMistake);
  const completed = state.plan.kind === 'finite' && frameAt(state.plan, nextCursor) === null;
  const exit = scheduleEffect(state, 'exitCleanup', EXIT_CLEANUP_MS, target.id);
  const completion = completed
    ? scheduleEffect(exit.state, 'completion', COMPLETION_DELAY_MS)
    : { state: exit.state, effect: null };
  const nextState: PracticeState = {
    ...completion.state,
    cursor: nextCursor,
    lastAcceptedAt: at,
    matchedFrameId: null,
    detectedPitch: null,
    matchStartedAt: null,
    wrongStartedAt: null,
    hadMistake: false,
    exitingFrames: [...state.exitingFrames, target],
    status: 'correct',
    score,
    streak,
    stats,
    roleStats,
    completion: completion.effect
      ? { kind: 'pending', token: completion.effect.token }
      : state.completion,
  };
  return {
    state: nextState,
    effects: [
      {
        kind: 'attemptAccepted',
        epoch: state.epoch,
        plan: state.plan,
        hadMistake: state.hadMistake,
        score,
        streak,
        stats,
        acceptedAt: at,
      },
      exit.effect,
      ...(completion.effect ? [completion.effect] : []),
    ],
  };
}

function scheduleEffect(
  state: PracticeState,
  effect: 'exitCleanup' | 'completion',
  delayMs: number,
  frameId?: string
): {
  readonly state: PracticeState;
  readonly effect: Extract<PracticeEffect, { kind: 'schedule' }>;
} {
  const token = asEffectToken(state.nextToken + 1);
  const pending = { token, effect, ...(frameId ? { frameId } : {}) };
  return {
    state: {
      ...state,
      nextToken: token,
      pendingEffects: [...state.pendingEffects, pending],
    },
    effect: {
      kind: 'schedule',
      epoch: state.epoch,
      token,
      delayMs,
      effect,
      ...(frameId ? { frameId } : {}),
    },
  };
}
