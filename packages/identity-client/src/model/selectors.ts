import type { IdentityFailure, IdentityState } from './types';

export interface IdentityView {
  status: 'booting' | 'anonymous' | 'authenticated';
  hasPasskeys: boolean;
  operation: 'idle' | 'checkingSession' | 'login' | 'registration' | 'logout';
  failure: IdentityFailure | null;
}

export function selectIdentityView(state: IdentityState): IdentityView {
  const status = state.session.kind === 'checking' ? 'booting' : state.session.kind;
  const hasPasskeys = state.session.kind === 'checking' ? false : state.session.hasPasskeys;
  const operation = (() => {
    if (!state.operation) return 'idle';
    if (state.operation.kind === 'sessionCheck' || state.operation.kind === 'sessionRefresh') {
      return 'checkingSession';
    }
    return state.operation.kind;
  })();
  return { status, hasPasskeys, operation, failure: state.failure };
}
