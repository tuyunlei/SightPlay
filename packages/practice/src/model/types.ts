export type { NoteName } from '@sightplay/music-domain';

type Brand<Value, Name extends string> = Value & { readonly __brand: Name };

export type MidiPitch = Brand<number, 'MidiPitch'>;
export type RandomSeed = Brand<number, 'RandomSeed'>;
export type SessionEpoch = Brand<number, 'SessionEpoch'>;
export type EffectToken = Brand<number, 'EffectToken'>;

export type Clef = 'treble' | 'bass';
export type PracticeRange = 'central' | 'upper' | 'combined';
export type HandMode = 'right-hand' | 'left-hand' | 'both-hands';
export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
export type NonEmptyReadonlyArray<Value> = readonly [Value, ...Value[]];

export interface ScoreFrame {
  readonly id: string;
  readonly index: number;
  readonly pitches: NonEmptyReadonlyArray<MidiPitch>;
  readonly duration?: NoteDuration;
}

export interface RandomExerciseConfig {
  readonly clef: Clef;
  readonly practiceRange: PracticeRange;
  readonly handMode: HandMode;
  readonly includeAccidentals: boolean;
}

export interface ExerciseMetadata {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
  readonly difficulty?: 'beginner' | 'intermediate' | 'advanced';
  readonly noteLabels?: readonly string[];
}

export type ExercisePlan =
  | {
      readonly kind: 'finite';
      readonly source: 'song' | 'coach';
      readonly frames: NonEmptyReadonlyArray<ScoreFrame>;
      readonly metadata: ExerciseMetadata;
      readonly clef: Clef;
      readonly handMode: HandMode;
    }
  | {
      readonly kind: 'generated';
      readonly source: 'random';
      readonly seed: RandomSeed;
      readonly config: RandomExerciseConfig;
      readonly metadata: ExerciseMetadata;
    };

export type InstrumentObservation =
  | { readonly kind: 'midiPressed'; readonly pitch: MidiPitch; readonly at: number }
  | { readonly kind: 'midiReleased'; readonly pitch: MidiPitch; readonly at: number }
  | { readonly kind: 'microphonePitch'; readonly pitch: MidiPitch | null; readonly at: number }
  | { readonly kind: 'midiConnectionChanged'; readonly connected: boolean; readonly at: number };

export interface SessionStats {
  readonly totalAttempts: number;
  readonly cleanHits: number;
  readonly bpm: number;
}

export type PracticeStatus = 'waiting' | 'listening' | 'correct' | 'incorrect';

export interface HeldPitch {
  readonly pitch: MidiPitch;
  readonly matchesTarget: boolean;
}

export type PracticeCompletion =
  | { readonly kind: 'active' }
  | { readonly kind: 'pending'; readonly token: EffectToken }
  | { readonly kind: 'completed'; readonly completedAt: number };

export interface PendingPracticeEffect {
  readonly token: EffectToken;
  readonly effect: 'exitCleanup' | 'completion';
  readonly frameId?: string;
}

export interface PracticeState {
  readonly epoch: SessionEpoch;
  readonly plan: ExercisePlan;
  readonly cursor: number;
  readonly startedAt: number;
  readonly lastAcceptedAt: number;
  readonly heldPitches: readonly HeldPitch[];
  readonly matchedFrameId: string | null;
  readonly detectedPitch: MidiPitch | null;
  readonly matchStartedAt: number | null;
  readonly wrongStartedAt: number | null;
  readonly hadMistake: boolean;
  readonly exitingFrames: readonly ScoreFrame[];
  readonly status: PracticeStatus;
  readonly score: number;
  readonly streak: number;
  readonly stats: SessionStats;
  readonly microphone: 'inactive' | 'starting' | 'listening';
  readonly midiConnected: boolean;
  readonly completion: PracticeCompletion;
  readonly pendingEffects: readonly PendingPracticeEffect[];
  readonly nextToken: number;
}

export type PracticeAction =
  | { readonly kind: 'exerciseStarted'; readonly plan: ExercisePlan; readonly now: number }
  | { readonly kind: 'instrumentObserved'; readonly observation: InstrumentObservation }
  | { readonly kind: 'microphoneStartRequested' }
  | { readonly kind: 'microphoneStarted' }
  | { readonly kind: 'microphoneStopped' }
  | { readonly kind: 'microphoneStartFailed' }
  | { readonly kind: 'statsReset'; readonly now: number }
  | {
      readonly kind: 'effectElapsed';
      readonly epoch: SessionEpoch;
      readonly token: EffectToken;
      readonly effect: 'exitCleanup' | 'completion';
      readonly frameId?: string;
      readonly now: number;
    };

export type PracticeEffect =
  | {
      readonly kind: 'attemptAccepted';
      readonly epoch: SessionEpoch;
      readonly plan: ExercisePlan;
      readonly hadMistake: boolean;
      readonly score: number;
      readonly streak: number;
      readonly stats: SessionStats;
      readonly acceptedAt: number;
    }
  | {
      readonly kind: 'schedule';
      readonly epoch: SessionEpoch;
      readonly token: EffectToken;
      readonly delayMs: number;
      readonly effect: 'exitCleanup' | 'completion';
      readonly frameId?: string;
    }
  | { readonly kind: 'startMicrophone'; readonly epoch: SessionEpoch }
  | { readonly kind: 'stopMicrophone'; readonly epoch: SessionEpoch }
  | { readonly kind: 'microphoneFailed'; readonly epoch: SessionEpoch }
  | {
      readonly kind: 'exerciseCompleted';
      readonly epoch: SessionEpoch;
      readonly plan: ExercisePlan;
      readonly score: number;
      readonly streak: number;
      readonly stats: SessionStats;
      readonly completedAt: number;
    };

export interface PracticeTransition {
  readonly state: PracticeState;
  readonly effects: readonly PracticeEffect[];
}

export const asMidiPitch = (value: number): MidiPitch => value as MidiPitch;
export const asRandomSeed = (value: number): RandomSeed => value as RandomSeed;
export const asSessionEpoch = (value: number): SessionEpoch => value as SessionEpoch;
export const asEffectToken = (value: number): EffectToken => value as EffectToken;
