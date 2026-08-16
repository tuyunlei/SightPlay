import type { AppContentRoute } from '@sightplay/app-shell';
import type { GuidanceOutput } from '@sightplay/guidance';
import type { Clef, ExercisePlan, PracticeRange } from '@sightplay/practice';

import { createCoachExercise } from '../practice/createExercisePlan';

export interface GuidanceOutputPorts {
  readonly currentClef: () => Clef;
  readonly startExercise: (plan: ExercisePlan) => void;
  readonly selectClef: (clef: Clef) => void;
  readonly selectPracticeRange: (range: PracticeRange) => void;
  readonly navigate: (route: AppContentRoute) => void;
}

export function applyGuidanceOutput(output: GuidanceOutput, ports: GuidanceOutputPorts): void {
  if (output.kind === 'exerciseProposed') {
    const exercise = createCoachExercise(output.proposal, ports.currentClef());
    if (exercise) ports.startExercise(exercise);
    return;
  }
  const action = output.action;
  switch (action.kind) {
    case 'selectClef':
      ports.selectClef(action.clef);
      return;
    case 'selectPracticeRange':
      ports.selectPracticeRange(action.range);
      return;
    case 'navigateDifficulty':
      ports.navigate({ kind: 'library', difficulty: action.difficulty });
      return;
    case 'navigateSong':
      ports.navigate({ kind: 'songPractice', songId: action.songId });
      return;
    default:
      assertNever(action);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled Guidance output: ${JSON.stringify(value)}`);
}
