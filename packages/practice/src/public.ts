export {
  createFiniteExercise,
  createMidiPitch,
  createRandomExercise,
  frameAt,
  parseScientificPitch,
} from './model/exercise';
export type {
  ExerciseResult,
  FiniteExerciseResult,
  FiniteFrameInput,
  RandomExerciseResult,
} from './model/exercise';
export { computeAccuracy } from './model/scoring';
export { selectPracticeView } from './model/selectors';
export type { PracticeNoteView, PracticeView, PressedPitchView } from './model/selectors';
export { createPracticeState, transitionPractice } from './model/transition';
export type {
  Clef,
  ExerciseMetadata,
  ExercisePlan,
  HandMode,
  InstrumentObservation,
  MidiPitch,
  NoteDuration,
  NoteName,
  PracticeAction,
  PracticeEffect,
  PracticeRange,
  PracticeState,
  PracticeTransition,
  RandomExerciseConfig,
  ScoreFrame,
  SessionStats,
} from './model/types';
export type {
  MicrophoneInputPort,
  MidiInputPort,
  MidiInputSignal,
  PracticeClockPort,
  PracticePorts,
  PracticeSchedulerPort,
  PracticeSeedPort,
} from './ports';
export { PracticeProvider } from './react/PracticeProvider';
export type { PracticeClient } from './react/PracticeContext';
export { usePractice } from './react/usePractice';
export { createPracticeRuntime } from './runtime/practiceRuntime';
export type { PracticeIntent, PracticeOutput, PracticeRuntime } from './runtime/contracts';
