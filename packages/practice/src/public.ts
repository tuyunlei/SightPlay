export {
  createFiniteExercise,
  createMidiPitch,
  createRandomExercise,
  frameAt,
  parseScientificPitch,
} from './model/exercise';
export {
  createCurriculumExercise,
  CURRICULUM_LESSONS,
  CURRICULUM_MODULES,
  isCurriculumLessonId,
  isPlayableCurriculumLessonId,
  PLAYABLE_CURRICULUM_LESSONS,
} from './model/curriculum';
export type {
  CurriculumCapability,
  CurriculumChapter,
  CurriculumChapterId,
  CurriculumImplementationStatus,
  CurriculumLessonSummary,
  CurriculumModule,
  CurriculumModuleId,
} from './model/curriculum';
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
  CurriculumLessonId,
  ExerciseMetadata,
  ExerciseFrameRole,
  ExercisePlan,
  HandMode,
  InstrumentObservation,
  MidiPitch,
  NoteDuration,
  NoteName,
  PracticeAction,
  PracticeEffect,
  PracticeRange,
  PlayableCurriculumLessonId,
  PracticeState,
  PracticeTransition,
  RandomExerciseConfig,
  ScoreFrame,
  RoleStats,
  AttemptStats,
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
