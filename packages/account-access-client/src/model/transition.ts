import {
  initialAccountAccessState,
  type AccountAccessAction,
  type AccountAccessEffect,
  type AccountAccessOperation,
  type AccountAccessState,
  type AccountAccessTransition,
} from './types';

type AccountAccessOperationInput =
  | { readonly kind: 'loadingCredentials' }
  | { readonly kind: 'creatingInvitation' }
  | { readonly kind: 'revokingCredential'; readonly credentialId: string };

const unchanged = (state: AccountAccessState): AccountAccessTransition => ({
  state,
  effects: [],
  outputs: [],
});

function begin(
  state: AccountAccessState,
  operation: AccountAccessOperationInput,
  effect: (operationId: number) => AccountAccessEffect
): AccountAccessTransition {
  if (state.operation) return unchanged(state);
  const operationId = state.nextOperationId + 1;
  return {
    state: {
      ...state,
      operation: { ...operation, id: operationId } as AccountAccessOperation,
      failure: null,
      nextOperationId: operationId,
    },
    effects: [effect(operationId)],
    outputs: [],
  };
}

function handleIntent(
  state: AccountAccessState,
  action: AccountAccessAction
): AccountAccessTransition | null {
  if (action.kind === 'started') {
    return begin(state, { kind: 'loadingCredentials' }, (operationId) => ({
      kind: 'loadCredentials',
      operationId,
    }));
  }
  if (action.kind === 'invitationRequested' && state.loaded) {
    return begin(state, { kind: 'creatingInvitation' }, (operationId) => ({
      kind: 'createInvitation',
      operationId,
    }));
  }
  if (action.kind === 'credentialRevocationRequested' && state.credentials.length > 1) {
    const exists = state.credentials.some((credential) => credential.id === action.credentialId);
    if (!exists) return unchanged(state);
    return begin(
      state,
      { kind: 'revokingCredential', credentialId: action.credentialId },
      (operationId) => ({
        kind: 'revokeCredential',
        operationId,
        credentialId: action.credentialId,
      })
    );
  }
  if (action.kind === 'invitationDismissed') {
    return { state: { ...state, invitationCode: null }, effects: [], outputs: [] };
  }
  if (action.kind === 'failureCleared') {
    return { state: { ...state, failure: null }, effects: [], outputs: [] };
  }
  return null;
}

export function transitionAccountAccess(
  state: AccountAccessState,
  action: AccountAccessAction
): AccountAccessTransition {
  const intent = handleIntent(state, action);
  if (intent) return intent;
  const operation = state.operation;
  if (!operation || !('operationId' in action) || action.operationId !== operation.id) {
    return unchanged(state);
  }
  if (action.kind === 'operationFailed') {
    return {
      state: { ...state, operation: null, failure: action.failure, loaded: true },
      effects: [],
      outputs: [],
    };
  }
  if (action.kind === 'credentialsLoaded' && operation.kind === 'loadingCredentials') {
    return {
      state: { ...state, credentials: action.credentials, loaded: true, operation: null },
      effects: [],
      outputs: [],
    };
  }
  if (action.kind === 'invitationCreated' && operation.kind === 'creatingInvitation') {
    return {
      state: { ...state, invitationCode: action.code, operation: null },
      effects: [],
      outputs: [],
    };
  }
  if (action.kind === 'credentialRevoked' && operation.kind === 'revokingCredential') {
    return {
      state: {
        ...state,
        credentials: state.credentials.filter(({ id }) => id !== operation.credentialId),
        operation: null,
      },
      effects: [],
      outputs: [{ kind: 'credentialSetChanged' }],
    };
  }
  return unchanged(state);
}

export function resetAccountAccessState(): AccountAccessState {
  return { ...initialAccountAccessState };
}
