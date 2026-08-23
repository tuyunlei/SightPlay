export type GuidanceLanguage = 'en' | 'zh';
export type GuidanceClef = 'treble' | 'bass';
export type GuidanceRange = 'central' | 'upper' | 'combined';
export type GuidanceSource = 'random' | 'song' | 'coach' | 'lesson';
export type HintKind = 'encouragement' | 'tip';

export type GuidanceMessageContent =
  | { readonly kind: 'welcome' }
  | { readonly kind: 'exerciseCompletedNotice' }
  | { readonly kind: 'text'; readonly text: string; readonly exerciseAvailable: boolean }
  | { readonly kind: 'connectionFailure' }
  | { readonly kind: 'exerciseLoaded'; readonly title: string; readonly count: number };

export interface GuidanceMessage {
  readonly id: number;
  readonly role: 'user' | 'coach';
  readonly content: GuidanceMessageContent;
}

export type GuidanceHintContent =
  | { readonly kind: 'providerText'; readonly text: string }
  | {
      readonly kind: 'local';
      readonly message: 'greatStreak' | 'awesome' | 'trySlower' | 'keepGoing' | 'practiceRange';
    };

export interface GuidanceHint {
  readonly id: number;
  readonly type: HintKind;
  readonly content: GuidanceHintContent;
  readonly timerToken: number;
}

export type GuidanceRecommendationAction =
  | { readonly kind: 'selectClef'; readonly clef: GuidanceClef }
  | { readonly kind: 'selectPracticeRange'; readonly range: GuidanceRange }
  | {
      readonly kind: 'navigateDifficulty';
      readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
    }
  | { readonly kind: 'navigateSong'; readonly songId: string };

export interface GuidanceRecommendation {
  readonly id: string;
  readonly type: 'practiceRange' | 'song' | 'clef' | 'general';
  readonly content:
    | { readonly kind: 'tryHarderSong'; readonly difficulty: 'intermediate' | 'advanced' }
    | { readonly kind: 'keepPracticing' }
    | { readonly kind: 'tryBass' }
    | { readonly kind: 'expandRange' }
    | { readonly kind: 'trySong' }
    | { readonly kind: 'narrowRange' }
    | { readonly kind: 'slowDown' };
  readonly action?: GuidanceRecommendationAction;
}

export interface GuidanceContext {
  readonly clef: GuidanceClef;
  readonly language: GuidanceLanguage;
}

export type PracticeGuidanceObservation =
  | {
      readonly kind: 'attemptAccepted';
      readonly contextId: string;
      readonly at: number;
      readonly source: GuidanceSource;
      readonly clef: GuidanceClef;
      readonly range: GuidanceRange;
      readonly totalAttempts: number;
      readonly cleanHits: number;
      readonly streak: number;
      readonly hadMistake: boolean;
    }
  | {
      readonly kind: 'exerciseCompleted';
      readonly contextId: string;
      readonly at: number;
      readonly source: GuidanceSource;
      readonly clef: GuidanceClef;
      readonly range: GuidanceRange;
      readonly totalAttempts: number;
      readonly cleanHits: number;
      readonly streak: number;
      readonly difficulty?: 'beginner' | 'intermediate' | 'advanced';
    };

export interface ExerciseProposal {
  readonly title: string;
  readonly description: string;
  readonly notes: readonly [string, ...string[]];
}

export interface GuidanceProviderReply {
  readonly replyText: string;
  readonly challengeData: {
    readonly title: string;
    readonly description: string;
    readonly notes: readonly string[];
  } | null;
}

export type GuidanceChatFailure =
  | 'cancelled'
  | 'unauthorized'
  | 'providerUnavailable'
  | 'invalidResponse'
  | 'internal';

export type GuidanceChatResult =
  | { readonly ok: true; readonly reply: GuidanceProviderReply }
  | { readonly ok: false; readonly failure: GuidanceChatFailure };

export interface GuidanceState {
  readonly context: GuidanceContext;
  readonly messages: readonly GuidanceMessage[];
  readonly pendingConversation: number | null;
  readonly pendingHint: { readonly operation: number; readonly type: HintKind } | null;
  readonly hint: GuidanceHint | null;
  readonly lastHintAt: number | null;
  readonly previousStreak: number;
  readonly consecutiveMistakes: number;
  readonly recommendationContext: string | null;
  readonly recommendations: readonly GuidanceRecommendation[];
  readonly dismissedRecommendationIds: readonly string[];
  readonly nextOperation: number;
  readonly nextMessageId: number;
  readonly nextHintId: number;
  readonly nextTimerToken: number;
}

export type GuidanceAction =
  | { readonly kind: 'contextChanged'; readonly context: GuidanceContext }
  | { readonly kind: 'messageSubmitted'; readonly text: string }
  | {
      readonly kind: 'chatResolved';
      readonly operation: number;
      readonly result: GuidanceChatResult;
    }
  | { readonly kind: 'practiceObserved'; readonly observation: PracticeGuidanceObservation }
  | {
      readonly kind: 'hintResolved';
      readonly operation: number;
      readonly type: HintKind;
      readonly result: GuidanceChatResult;
      readonly now: number;
    }
  | { readonly kind: 'hintDismissed' }
  | { readonly kind: 'hintTimerElapsed'; readonly token: number }
  | { readonly kind: 'recommendationDismissed'; readonly id: string }
  | { readonly kind: 'recommendationApplied'; readonly id: string };

export type GuidanceEffect =
  | {
      readonly kind: 'requestChat';
      readonly purpose: 'conversation' | HintKind;
      readonly operation: number;
      readonly message: string;
      readonly context: GuidanceContext;
    }
  | { readonly kind: 'scheduleHintDismiss'; readonly token: number; readonly delayMs: number }
  | { readonly kind: 'cancelHintDismiss'; readonly token: number }
  | { readonly kind: 'emit'; readonly output: GuidanceOutput };

export type GuidanceOutput =
  | { readonly kind: 'exerciseProposed'; readonly proposal: ExerciseProposal }
  | {
      readonly kind: 'recommendationApplied';
      readonly action: GuidanceRecommendationAction;
    };

export interface GuidanceTransition {
  readonly state: GuidanceState;
  readonly effects: readonly GuidanceEffect[];
}
