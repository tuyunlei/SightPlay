import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import type { ExercisePlan } from '../model/types';
import type { PracticePorts } from '../ports';
import type { PracticeOutput } from '../runtime/contracts';
import { createPracticeRuntime } from '../runtime/practiceRuntime';

import { PracticeContext, type PracticeActions, type PracticeClient } from './PracticeContext';

export function PracticeProvider({
  children,
  initialPlan,
  ports,
  onOutput,
}: {
  readonly children: ReactNode;
  readonly initialPlan: ExercisePlan;
  readonly ports: PracticePorts;
  readonly onOutput?: (output: PracticeOutput) => void;
}) {
  const [runtime] = useState(() => createPracticeRuntime(ports, initialPlan));
  const [started, setStarted] = useState(false);
  const view = useSyncExternalStore(runtime.subscribe, runtime.getView, runtime.getView);

  useEffect(() => {
    runtime.start();
    setStarted(true);
    return () => {
      setStarted(false);
      runtime.dispose();
    };
  }, [runtime]);

  useEffect(() => (onOutput ? runtime.onOutput(onOutput) : undefined), [onOutput, runtime]);

  const actions = useMemo<PracticeActions>(
    () => ({
      startExercise: (plan) => runtime.dispatch({ kind: 'startExercise', plan }),
      restartExercise: () => runtime.dispatch({ kind: 'restartExercise' }),
      startRandom: (config) => runtime.dispatch({ kind: 'configureRandom', config }),
      startLesson: (lessonId) => runtime.dispatch({ kind: 'startLesson', lessonId }),
      selectClef: (clef) => runtime.dispatch({ kind: 'selectClef', clef }),
      selectPracticeRange: (practiceRange) =>
        runtime.dispatch({ kind: 'selectPracticeRange', practiceRange }),
      selectHandMode: (handMode) => runtime.dispatch({ kind: 'selectHandMode', handMode }),
      toggleMicrophone: () => runtime.dispatch({ kind: 'toggleMicrophone' }),
      resetStats: () => runtime.dispatch({ kind: 'resetStats' }),
      onOutput: runtime.onOutput,
    }),
    [runtime]
  );
  const client = useMemo<PracticeClient>(() => ({ ...actions, view }), [actions, view]);

  return started ? (
    <PracticeContext.Provider value={client}>{children}</PracticeContext.Provider>
  ) : null;
}
