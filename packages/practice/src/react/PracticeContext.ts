import { createContext } from 'react';

import type { PracticeView } from '../model/selectors';
import type {
  Clef,
  CurriculumLessonId,
  ExercisePlan,
  HandMode,
  PracticeRange,
  RandomExerciseConfig,
} from '../model/types';
import type { PracticeOutput } from '../runtime/contracts';

export interface PracticeActions {
  startExercise(plan: ExercisePlan): void;
  restartExercise(): void;
  startRandom(config: RandomExerciseConfig): void;
  startLesson(lessonId: CurriculumLessonId): void;
  selectClef(clef: Clef): void;
  selectPracticeRange(practiceRange: PracticeRange): void;
  selectHandMode(handMode: HandMode): void;
  toggleMicrophone(): void;
  resetStats(): void;
  onOutput(listener: (output: PracticeOutput) => void): () => void;
}

export interface PracticeClient extends PracticeActions {
  readonly view: PracticeView;
}

export const PracticeContext = createContext<PracticeClient | null>(null);
