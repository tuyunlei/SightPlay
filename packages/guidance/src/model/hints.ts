import type {
  GuidanceEffect,
  GuidanceState,
  GuidanceTransition,
  HintKind,
  PracticeGuidanceObservation,
} from './types';

const RATE_LIMIT_MS = 30_000;

export function observeForHint(
  state: GuidanceState,
  observation: PracticeGuidanceObservation
): GuidanceTransition {
  if (observation.kind !== 'attemptAccepted' || observation.source !== 'random') {
    return { state, effects: [] };
  }
  const mistakes = observation.hadMistake ? state.consecutiveMistakes + 1 : 0;
  const streakTrigger =
    observation.streak > state.previousStreak &&
    observation.streak > 0 &&
    observation.streak % 5 === 0;
  const mistakeTrigger = mistakes >= 3;
  const nextState = {
    ...state,
    previousStreak: observation.streak,
    consecutiveMistakes: mistakeTrigger ? 0 : mistakes,
  };
  if (!streakTrigger && !mistakeTrigger) return { state: nextState, effects: [] };
  if (
    state.pendingHint ||
    (state.lastHintAt !== null && observation.at - state.lastHintAt < RATE_LIMIT_MS)
  ) {
    return { state: nextState, effects: [] };
  }
  return requestHint(nextState, streakTrigger ? 'encouragement' : 'tip');
}

function requestHint(state: GuidanceState, type: HintKind): GuidanceTransition {
  const operation = state.nextOperation + 1;
  const message =
    type === 'encouragement'
      ? `Give a warm sight-reading encouragement under 15 words for a ${state.previousStreak}-note streak.`
      : 'Give a helpful sight-reading tip under 15 words for repeated note-reading mistakes.';
  const effect: GuidanceEffect = {
    kind: 'requestChat',
    purpose: type,
    operation,
    message,
    context: state.context,
  };
  return {
    state: { ...state, nextOperation: operation, pendingHint: { operation, type } },
    effects: [effect],
  };
}

export function localHintMessage(type: HintKind, id: number) {
  const encouragement = ['greatStreak', 'awesome'] as const;
  const tips = ['trySlower', 'keepGoing', 'practiceRange'] as const;
  const pool = type === 'encouragement' ? encouragement : tips;
  return pool[id % pool.length];
}
