import { observeForHint, localHintMessage } from './hints';
import { createExerciseProposal } from './proposal';
import { recommend } from './recommendations';
import type {
  GuidanceAction,
  GuidanceEffect,
  GuidanceMessage,
  GuidanceState,
  GuidanceTransition,
} from './types';

const HINT_DISPLAY_MS = 5_000;

export function createGuidanceState(context: GuidanceState['context']): GuidanceState {
  return {
    context,
    messages: [{ id: 1, role: 'coach', content: { kind: 'welcome' } }],
    pendingConversation: null,
    pendingHint: null,
    hint: null,
    lastHintAt: null,
    previousStreak: 0,
    consecutiveMistakes: 0,
    recommendationContext: null,
    recommendations: [],
    dismissedRecommendationIds: [],
    nextOperation: 0,
    nextMessageId: 1,
    nextHintId: 0,
    nextTimerToken: 0,
  };
}

const unchanged = (state: GuidanceState): GuidanceTransition => ({ state, effects: [] });

export function transitionGuidance(
  state: GuidanceState,
  action: GuidanceAction
): GuidanceTransition {
  if (action.kind === 'contextChanged') {
    return { state: { ...state, context: action.context }, effects: [] };
  }
  if (action.kind === 'messageSubmitted') return submitMessage(state, action.text);
  if (action.kind === 'chatResolved') return resolveConversation(state, action);
  if (action.kind === 'practiceObserved') return observePractice(state, action.observation);
  if (action.kind === 'hintResolved') return resolveHint(state, action);
  if (action.kind === 'hintDismissed') return dismissHint(state);
  if (action.kind === 'hintTimerElapsed') {
    return state.hint?.timerToken === action.token
      ? { state: { ...state, hint: null }, effects: [] }
      : unchanged(state);
  }
  if (action.kind === 'recommendationDismissed') {
    return removeRecommendation(state, action.id, []);
  }
  return applyRecommendation(state, action.id);
}

function submitMessage(state: GuidanceState, rawText: string): GuidanceTransition {
  const text = rawText.trim();
  if (!text || state.pendingConversation !== null) return unchanged(state);
  const operation = state.nextOperation + 1;
  const messageId = state.nextMessageId + 1;
  return {
    state: {
      ...state,
      messages: [
        ...state.messages,
        { id: messageId, role: 'user', content: { kind: 'text', text, exerciseAvailable: false } },
      ],
      pendingConversation: operation,
      nextOperation: operation,
      nextMessageId: messageId,
    },
    effects: [
      {
        kind: 'requestChat',
        purpose: 'conversation',
        operation,
        message: text,
        context: state.context,
      },
    ],
  };
}

function resolveConversation(
  state: GuidanceState,
  action: Extract<GuidanceAction, { kind: 'chatResolved' }>
): GuidanceTransition {
  if (state.pendingConversation !== action.operation) return unchanged(state);
  if (!action.result.ok) return conversationFailure(state);
  const proposal = action.result.reply.challengeData
    ? createExerciseProposal(action.result.reply.challengeData)
    : null;
  if (action.result.reply.challengeData && !proposal) return conversationFailure(state);

  const replyId = state.nextMessageId + 1;
  const reply: GuidanceMessage = {
    id: replyId,
    role: 'coach',
    content: {
      kind: 'text',
      text: action.result.reply.replyText,
      exerciseAvailable: proposal !== null,
    },
  };
  const loadedId = replyId + (proposal ? 1 : 0);
  return {
    state: {
      ...state,
      messages: [
        ...state.messages,
        reply,
        ...(proposal
          ? [
              {
                id: loadedId,
                role: 'coach' as const,
                content: {
                  kind: 'exerciseLoaded' as const,
                  title: proposal.title,
                  count: proposal.notes.length,
                },
              },
            ]
          : []),
      ],
      pendingConversation: null,
      nextMessageId: loadedId,
    },
    effects: proposal ? [{ kind: 'emit', output: { kind: 'exerciseProposed', proposal } }] : [],
  };
}

function conversationFailure(state: GuidanceState): GuidanceTransition {
  const messageId = state.nextMessageId + 1;
  return {
    state: {
      ...state,
      messages: [
        ...state.messages,
        { id: messageId, role: 'coach', content: { kind: 'connectionFailure' } },
      ],
      pendingConversation: null,
      nextMessageId: messageId,
    },
    effects: [],
  };
}

function observePractice(
  state: GuidanceState,
  observation: Extract<GuidanceAction, { kind: 'practiceObserved' }>['observation']
): GuidanceTransition {
  const sameContext = state.recommendationContext === observation.contextId;
  const dismissed = sameContext ? state.dismissedRecommendationIds : [];
  const recommendations = recommend(observation).filter(({ id }) => !dismissed.includes(id));
  const recommendedState = {
    ...state,
    recommendationContext: observation.contextId,
    recommendations,
    dismissedRecommendationIds: dismissed,
  };
  const hinted = observeForHint(recommendedState, observation);
  if (observation.kind !== 'exerciseCompleted' || observation.source !== 'coach') return hinted;
  const feedback = requestCompletionFeedback(hinted.state);
  return { state: feedback.state, effects: [...hinted.effects, ...feedback.effects] };
}

function requestCompletionFeedback(state: GuidanceState): GuidanceTransition {
  if (state.pendingConversation !== null) return unchanged(state);
  const operation = state.nextOperation + 1;
  const messageId = state.nextMessageId + 1;
  const message =
    state.context.language === 'zh'
      ? '我完成了刚才的视奏练习。请根据完成情况给我一句简短反馈。'
      : 'I completed the sight-reading exercise. Give me one short piece of feedback.';
  return {
    state: {
      ...state,
      messages: [
        ...state.messages,
        { id: messageId, role: 'user', content: { kind: 'exerciseCompletedNotice' } },
      ],
      pendingConversation: operation,
      nextOperation: operation,
      nextMessageId: messageId,
    },
    effects: [
      {
        kind: 'requestChat',
        purpose: 'conversation',
        operation,
        message,
        context: state.context,
      },
    ],
  };
}

function resolveHint(
  state: GuidanceState,
  action: Extract<GuidanceAction, { kind: 'hintResolved' }>
): GuidanceTransition {
  if (state.pendingHint?.operation !== action.operation || state.pendingHint.type !== action.type) {
    return unchanged(state);
  }
  const id = state.nextHintId + 1;
  const token = state.nextTimerToken + 1;
  const content = action.result.ok
    ? { kind: 'providerText' as const, text: action.result.reply.replyText }
    : { kind: 'local' as const, message: localHintMessage(action.type, id) };
  const effects: GuidanceEffect[] = [
    ...(state.hint ? [{ kind: 'cancelHintDismiss' as const, token: state.hint.timerToken }] : []),
    { kind: 'scheduleHintDismiss', token, delayMs: HINT_DISPLAY_MS },
  ];
  return {
    state: {
      ...state,
      pendingHint: null,
      hint: { id, type: action.type, content, timerToken: token },
      lastHintAt: action.now,
      nextHintId: id,
      nextTimerToken: token,
    },
    effects,
  };
}

function dismissHint(state: GuidanceState): GuidanceTransition {
  return state.hint
    ? {
        state: { ...state, hint: null },
        effects: [{ kind: 'cancelHintDismiss', token: state.hint.timerToken }],
      }
    : unchanged(state);
}

function removeRecommendation(
  state: GuidanceState,
  id: string,
  effects: readonly GuidanceEffect[]
): GuidanceTransition {
  if (!state.recommendations.some((item) => item.id === id)) return unchanged(state);
  return {
    state: {
      ...state,
      recommendations: state.recommendations.filter((item) => item.id !== id),
      dismissedRecommendationIds: [...new Set([...state.dismissedRecommendationIds, id])],
    },
    effects,
  };
}

function applyRecommendation(state: GuidanceState, id: string): GuidanceTransition {
  const recommendation = state.recommendations.find((item) => item.id === id);
  if (!recommendation?.action) return unchanged(state);
  return removeRecommendation(state, id, [
    {
      kind: 'emit',
      output: { kind: 'recommendationApplied', action: recommendation.action },
    },
  ]);
}
