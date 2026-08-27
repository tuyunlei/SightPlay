import {
  initialAccountAccessState,
  type AccountAccessAction,
  type AccountAccessEffect,
  type AccountAccessOperation,
  type AccountAccessState,
  type AccountAccessTransition,
} from './types';

type AccountAccessOperationInput =
  | { readonly kind: 'loadingAccountAccess' }
  | { readonly kind: 'creatingInvitation' }
  | { readonly kind: 'revokingCredential'; readonly credentialId: string }
  | { readonly kind: 'creatingInvitationAccess' }
  | { readonly kind: 'revokingInvitationAccess' };

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
    return begin(state, { kind: 'loadingAccountAccess' }, (operationId) => ({
      kind: 'loadAccountAccess',
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
  if (action.kind === 'invitationAccessRequested' && state.loaded) {
    return begin(state, { kind: 'creatingInvitationAccess' }, (operationId) => ({
      kind: 'createInvitationAccess',
      operationId,
    }));
  }
  if (action.kind === 'invitationAccessRevocationRequested' && state.invitationAccess) {
    return begin(state, { kind: 'revokingInvitationAccess' }, (operationId) => ({
      kind: 'revokeInvitationAccess',
      operationId,
    }));
  }
  if (action.kind === 'invitationAccessTokenDismissed') {
    return { state: { ...state, invitationAccessToken: null }, effects: [], outputs: [] };
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
  return handleOperationResult(state, action);
}

function handleOperationResult(
  state: AccountAccessState,
  action: AccountAccessAction
): AccountAccessTransition {
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
  if (action.kind === 'accountAccessLoaded' && operation.kind === 'loadingAccountAccess') {
    return {
      state: {
        ...state,
        credentials: action.snapshot.credentials,
        invitationAccess: action.snapshot.invitationAccess,
        loaded: true,
        operation: null,
      },
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
  if (action.kind === 'invitationAccessCreated' && operation.kind === 'creatingInvitationAccess') {
    return {
      state: {
        ...state,
        invitationAccess: action.credential,
        invitationAccessToken: action.token,
        operation: null,
      },
      effects: [],
      outputs: [],
    };
  }
  if (action.kind === 'invitationAccessRevoked' && operation.kind === 'revokingInvitationAccess') {
    return {
      state: {
        ...state,
        invitationAccess: null,
        invitationAccessToken: null,
        operation: null,
      },
      effects: [],
      outputs: [],
    };
  }
  return unchanged(state);
}

export function resetAccountAccessState(): AccountAccessState {
  return { ...initialAccountAccessState };
}
