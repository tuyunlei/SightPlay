import type { PracticeView } from '../model/selectors';
import type { ExercisePlan, PracticeState, RandomExerciseConfig } from '../model/types';

export type PracticeOutput =
  | {
      readonly kind: 'attemptAccepted';
      readonly epoch: PracticeState['epoch'];
      readonly plan: ExercisePlan;
      readonly hadMistake: boolean;
      readonly score: number;
      readonly streak: number;
      readonly stats: PracticeState['stats'];
      readonly acceptedAt: number;
    }
  | {
      readonly kind: 'exerciseCompleted';
      readonly epoch: PracticeState['epoch'];
      readonly plan: ExercisePlan;
      readonly score: number;
      readonly streak: number;
      readonly stats: PracticeState['stats'];
      readonly completedAt: number;
    }
  | { readonly kind: 'microphoneFailed' };

export type PracticeIntent =
  | { readonly kind: 'startExercise'; readonly plan: ExercisePlan }
  | { readonly kind: 'restartExercise' }
  | { readonly kind: 'configureRandom'; readonly config: RandomExerciseConfig }
  | { readonly kind: 'selectClef'; readonly clef: RandomExerciseConfig['clef'] }
  | {
      readonly kind: 'selectPracticeRange';
      readonly practiceRange: RandomExerciseConfig['practiceRange'];
    }
  | { readonly kind: 'selectHandMode'; readonly handMode: RandomExerciseConfig['handMode'] }
  | { readonly kind: 'toggleMicrophone' }
  | { readonly kind: 'resetStats' }
  | { readonly kind: 'simulateMidiPressed'; readonly pitch: number }
  | { readonly kind: 'simulateMidiReleased'; readonly pitch: number };

export interface PracticeRuntime {
  getState(): PracticeState;
  getView(): PracticeView;
  canAcceptInput(): boolean;
  subscribe(listener: () => void): () => void;
  onOutput(listener: (output: PracticeOutput) => void): () => void;
  dispatch(intent: PracticeIntent): void;
  start(): void;
  dispose(): void;
}
