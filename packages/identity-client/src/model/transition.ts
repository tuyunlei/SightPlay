import {
  initialIdentityState,
  type IdentityAction,
  type IdentityEffect,
  type IdentityFailure,
  type IdentityOperation,
  type IdentityState,
  type IdentityTransition,
  type SessionSnapshot,
} from './types';

const unchanged = (state: IdentityState): IdentityTransition => ({ state, effects: [] });

function begin(
  state: IdentityState,
  operation: Omit<IdentityOperation, 'id'>,
  effect: (operationId: number) => IdentityEffect
): IdentityTransition {
  if (state.operation) return unchanged(state);
  const operationId = state.nextOperationId + 1;
  return {
    state: {
      ...state,
      operation: { ...operation, id: operationId } as IdentityOperation,
      failure: null,
      nextOperationId: operationId,
    },
    effects: [effect(operationId)],
  };
}

function fail(
  state: IdentityState,
  operation: IdentityOperation,
  failure: IdentityFailure
): IdentityTransition {
  return {
    state: { ...state, operation: null, failure },
    effects: [
      {
        kind: 'reportFailure',
        operationId: operation.id,
        operation: operation.kind,
        failure,
      },
    ],
  };
}

function acceptSession(
  state: IdentityState,
  operation: IdentityOperation,
  snapshot: SessionSnapshot
): IdentityTransition {
  if (
    (operation.kind === 'login' || operation.kind === 'registration') &&
    !snapshot.authenticated
  ) {
    const code =
      operation.kind === 'login' ? 'loginVerificationRejected' : 'registrationVerificationRejected';
    return fail(state, operation, { code, retryable: true });
  }
  const session = snapshot.authenticated
    ? ({ kind: 'authenticated', hasPasskeys: snapshot.hasPasskeys } as const)
    : ({ kind: 'anonymous', hasPasskeys: snapshot.hasPasskeys } as const);
  return { state: { ...state, session, operation: null, failure: null }, effects: [] };
}

function requestIntent(state: IdentityState, action: IdentityAction): IdentityTransition | null {
  if (action.kind === 'started') {
    return begin(state, { kind: 'sessionCheck', phase: 'loading' }, (operationId) => ({
      kind: 'loadSession',
      operationId,
    }));
  }
  if (action.kind === 'sessionRefreshRequested') {
    return begin(state, { kind: 'sessionRefresh', phase: 'loading' }, (operationId) => ({
      kind: 'loadSession',
      operationId,
    }));
  }
  if (action.kind === 'loginRequested' && state.session.kind === 'anonymous') {
    return begin(state, { kind: 'login', phase: 'checkingSupport' }, (operationId) => ({
      kind: 'checkPasskeySupport',
      operationId,
    }));
  }
  if (action.kind === 'registrationRequested' && state.session.kind === 'anonymous') {
    const operation = {
      kind: 'registration' as const,
      phase: 'checkingSupport' as const,
      inviteCode: action.inviteCode,
      ...(action.name ? { name: action.name } : {}),
    };
    return begin(state, operation, (operationId) => ({ kind: 'checkPasskeySupport', operationId }));
  }
  if (action.kind === 'logoutRequested' && state.session.kind === 'authenticated') {
    return begin(state, { kind: 'logout', phase: 'requesting' }, (operationId) => ({
      kind: 'logout',
      operationId,
    }));
  }
  if (action.kind === 'failureCleared') {
    return { state: { ...state, failure: null }, effects: [] };
  }
  return null;
}

function supportResolved(
  state: IdentityState,
  operation: IdentityOperation,
  supported: boolean
): IdentityTransition {
  if (!supported) return fail(state, operation, { code: 'passkeysUnsupported', retryable: false });
  if (operation.kind === 'login') {
    return {
      state: { ...state, operation: { ...operation, phase: 'requestingOptions' } },
      effects: [{ kind: 'requestLoginOptions', operationId: operation.id }],
    };
  }
  if (operation.kind === 'registration') {
    return {
      state: { ...state, operation: { ...operation, phase: 'requestingOptions' } },
      effects: [
        {
          kind: 'requestRegistrationOptions',
          operationId: operation.id,
          inviteCode: operation.inviteCode,
        },
      ],
    };
  }
  return unchanged(state);
}

function advanceOperation(
  state: IdentityState,
  action: IdentityAction,
  operation: IdentityOperation
): IdentityTransition {
  if (action.kind === 'passkeySupportResolved') {
    return supportResolved(state, operation, action.supported);
  }
  if (action.kind === 'loginOptionsReceived' && operation.kind === 'login') {
    return {
      state: { ...state, operation: { ...operation, phase: 'authenticating' } },
      effects: [
        { kind: 'authenticatePasskey', operationId: operation.id, options: action.options },
      ],
    };
  }
  if (action.kind === 'registrationOptionsReceived' && operation.kind === 'registration') {
    return {
      state: { ...state, operation: { ...operation, phase: 'registering' } },
      effects: [{ kind: 'createPasskey', operationId: operation.id, options: action.options }],
    };
  }
  if (action.kind === 'authenticationCreated' && operation.kind === 'login') {
    return {
      state: { ...state, operation: { ...operation, phase: 'verifying' } },
      effects: [{ kind: 'verifyLogin', operationId: operation.id, credential: action.credential }],
    };
  }
  if (action.kind === 'registrationCreated' && operation.kind === 'registration') {
    return {
      state: { ...state, operation: { ...operation, phase: 'verifying' } },
      effects: [
        {
          kind: 'verifyRegistration',
          operationId: operation.id,
          credential: action.credential,
          inviteCode: operation.inviteCode,
          ...(operation.name ? { name: operation.name } : {}),
        },
      ],
    };
  }
  return unchanged(state);
}

export function transitionIdentity(
  state: IdentityState,
  action: IdentityAction
): IdentityTransition {
  const intentTransition = requestIntent(state, action);
  if (intentTransition) return intentTransition;

  const operation = state.operation;
  if (!operation || !('operationId' in action) || action.operationId !== operation.id) {
    return unchanged(state);
  }
  if (action.kind === 'operationFailed') return fail(state, operation, action.failure);
  if (action.kind === 'sessionLoaded') return acceptSession(state, operation, action.session);
  if (action.kind === 'logoutCompleted' && operation.kind === 'logout') {
    const hasPasskeys = state.session.kind === 'authenticated' && state.session.hasPasskeys;
    return {
      state: {
        ...state,
        session: { kind: 'anonymous', hasPasskeys },
        operation: null,
        failure: null,
      },
      effects: [],
    };
  }
  if (
    action.kind === 'verificationAccepted' &&
    (operation.kind === 'login' || operation.kind === 'registration')
  ) {
    return {
      state: { ...state, operation: { ...operation, phase: 'refreshing' } },
      effects: [{ kind: 'loadSession', operationId: operation.id }],
    };
  }
  return advanceOperation(state, action, operation);
}

export function resetIdentityState(): IdentityState {
  return { ...initialIdentityState };
}
