import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import type { GuidanceContext as ModelContext } from '../model/types';
import type { GuidancePorts } from '../ports';
import { createGuidanceRuntime, type GuidanceOutput } from '../runtime/guidanceRuntime';

import { GuidanceContext, type GuidanceActions, type GuidanceClient } from './GuidanceContext';

export function GuidanceProvider({
  children,
  initialContext,
  ports,
  onOutput,
}: {
  readonly children: ReactNode;
  readonly initialContext: ModelContext;
  readonly ports: GuidancePorts;
  readonly onOutput?: (output: GuidanceOutput) => void;
}) {
  const [runtime] = useState(() => createGuidanceRuntime(ports, initialContext));
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

  const actions = useMemo<GuidanceActions>(
    () => ({
      changeContext: (context) => runtime.dispatch({ kind: 'changeContext', context }),
      sendMessage: (text) => runtime.dispatch({ kind: 'sendMessage', text }),
      observePractice: (observation) => runtime.dispatch({ kind: 'observePractice', observation }),
      dismissHint: () => runtime.dispatch({ kind: 'dismissHint' }),
      dismissRecommendation: (id) => runtime.dispatch({ kind: 'dismissRecommendation', id }),
      applyRecommendation: (id) => runtime.dispatch({ kind: 'applyRecommendation', id }),
      onOutput: runtime.onOutput,
    }),
    [runtime]
  );
  const client = useMemo<GuidanceClient>(() => ({ ...actions, view }), [actions, view]);

  return started ? (
    <GuidanceContext.Provider value={client}>{children}</GuidanceContext.Provider>
  ) : null;
}
