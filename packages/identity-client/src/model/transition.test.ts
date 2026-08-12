import { describe, expect, it } from 'vitest';

import { transitionIdentity } from './transition';
import { initialIdentityState, type IdentityAction, type IdentityState } from './types';

function reduce(state: IdentityState, action: IdentityAction): IdentityState {
  return transitionIdentity(state, action).state;
}

function anonymousState(): IdentityState {
  const started = transitionIdentity(initialIdentityState, { kind: 'started' }).state;
  return reduce(started, {
    kind: 'sessionLoaded',
    operationId: 1,
    session: { authenticated: false, hasPasskeys: true },
  });
}

describe('Identity transition', () => {
  it('moves through login phases and authenticates only after the session proves it', () => {
    let state = reduce(anonymousState(), { kind: 'loginRequested' });
    expect(state.operation).toMatchObject({ id: 2, kind: 'login', phase: 'checkingSupport' });

    state = reduce(state, { kind: 'passkeySupportResolved', operationId: 2, supported: true });
    expect(state.operation).toMatchObject({ phase: 'requestingOptions' });

    state = reduce(state, {
      kind: 'loginOptionsReceived',
      operationId: 2,
      options: { challenge: 'challenge', allowCredentials: [] },
    });
    state = reduce(state, {
      kind: 'authenticationCreated',
      operationId: 2,
      credential: { value: { id: 'credential' } },
    });
    state = reduce(state, { kind: 'verificationAccepted', operationId: 2 });
    expect(state.session.kind).toBe('anonymous');
    expect(state.operation).toMatchObject({ phase: 'refreshing' });

    state = reduce(state, {
      kind: 'sessionLoaded',
      operationId: 2,
      session: { authenticated: true, hasPasskeys: true },
    });
    expect(state.session).toEqual({ kind: 'authenticated', hasPasskeys: true });
    expect(state.operation).toBeNull();
  });

  it('returns cancellation to an executable idle state and gives retry a new operation identity', () => {
    let state = reduce(anonymousState(), { kind: 'loginRequested' });
    state = reduce(state, {
      kind: 'operationFailed',
      operationId: 2,
      failure: { code: 'userCanceled', retryable: true },
    });

    expect(state.operation).toBeNull();
    expect(state.failure?.code).toBe('userCanceled');

    state = reduce(state, { kind: 'loginRequested' });
    expect(state.operation).toMatchObject({ id: 3, kind: 'login', phase: 'checkingSupport' });
    expect(state.failure).toBeNull();
  });

  it('ignores a result from a superseded operation epoch', () => {
    let state = reduce(anonymousState(), { kind: 'loginRequested' });
    state = reduce(state, {
      kind: 'operationFailed',
      operationId: 2,
      failure: { code: 'userCanceled', retryable: true },
    });
    state = reduce(state, { kind: 'loginRequested' });

    const afterStaleResult = reduce(state, {
      kind: 'sessionLoaded',
      operationId: 2,
      session: { authenticated: true, hasPasskeys: true },
    });

    expect(afterStaleResult).toBe(state);
    expect(afterStaleResult.session.kind).toBe('anonymous');
    expect(afterStaleResult.operation?.id).toBe(3);
  });

  it('logs out atomically without changing navigation', () => {
    const authenticated: IdentityState = {
      session: { kind: 'authenticated', hasPasskeys: true },
      operation: null,
      failure: null,
      nextOperationId: 4,
    };
    let state = reduce(authenticated, { kind: 'logoutRequested' });
    state = reduce(state, { kind: 'logoutCompleted', operationId: 5 });

    expect(state.session).toEqual({ kind: 'anonymous', hasPasskeys: true });
    expect(state.operation).toBeNull();
  });
});
