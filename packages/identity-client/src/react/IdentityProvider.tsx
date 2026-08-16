import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { selectIdentityView } from '../model/selectors';
import type { IdentityPorts } from '../ports';
import { createIdentityRuntime } from '../runtime/identityRuntime';

import { IdentityContext, type IdentityClient } from './contexts/IdentityContext';

export function IdentityProvider({
  children,
  ports,
}: {
  children: ReactNode;
  ports: IdentityPorts;
}) {
  const [runtime] = useState(() => createIdentityRuntime(ports));
  const state = useSyncExternalStore(runtime.subscribe, runtime.getState, runtime.getState);

  useEffect(() => {
    runtime.start();
    return () => runtime.dispose();
  }, [runtime]);

  const value = useMemo<IdentityClient>(
    () => ({
      state,
      view: selectIdentityView(state),
      login: () => runtime.dispatch({ kind: 'loginRequested' }),
      register: (input) => runtime.dispatch({ kind: 'registrationRequested', ...input }),
      logout: () => runtime.dispatch({ kind: 'logoutRequested' }),
      refreshSession: () => runtime.dispatch({ kind: 'sessionRefreshRequested' }),
      clearFailure: () => runtime.dispatch({ kind: 'failureCleared' }),
    }),
    [runtime, state]
  );

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}
