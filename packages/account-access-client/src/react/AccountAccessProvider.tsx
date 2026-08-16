import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import type { AccountAccessOutput } from '../model/types';
import type { AccountAccessPorts } from '../ports';
import { createAccountAccessRuntime } from '../runtime/accountAccessRuntime';

import { AccountAccessContext, type AccountAccessClient } from './AccountAccessContext';

export function AccountAccessProvider({
  active,
  children,
  ports,
  onOutput,
}: {
  active: boolean;
  children: ReactNode;
  ports: AccountAccessPorts;
  onOutput: (output: AccountAccessOutput) => void;
}) {
  const [runtime] = useState(() => createAccountAccessRuntime(ports));
  const state = useSyncExternalStore(runtime.subscribe, runtime.getState, runtime.getState);

  useEffect(() => runtime.onOutput(onOutput), [onOutput, runtime]);
  useEffect(() => {
    if (!active) return;
    runtime.start();
    return () => runtime.dispose();
  }, [active, runtime]);

  const value = useMemo<AccountAccessClient>(
    () => ({
      state,
      requestInvitation: () => runtime.dispatch({ kind: 'invitationRequested' }),
      dismissInvitation: () => runtime.dispatch({ kind: 'invitationDismissed' }),
      requestCredentialRevocation: (credentialId) =>
        runtime.dispatch({ kind: 'credentialRevocationRequested', credentialId }),
      clearFailure: () => runtime.dispatch({ kind: 'failureCleared' }),
    }),
    [runtime, state]
  );

  return <AccountAccessContext.Provider value={value}>{children}</AccountAccessContext.Provider>;
}
