import { describe, expect, it } from 'vitest';

import { resetAccountAccessState, transitionAccountAccess } from './transition';

const credentials = [
  { id: 'phone', name: 'Phone', createdAt: 1 },
  { id: 'laptop', name: 'Laptop', createdAt: 2 },
];

function loadedState() {
  const started = transitionAccountAccess(resetAccountAccessState(), { kind: 'started' });
  return transitionAccountAccess(started.state, {
    kind: 'accountAccessLoaded',
    operationId: 1,
    snapshot: { credentials, invitationAccess: null },
  }).state;
}

describe('Account Access transition', () => {
  it('loads credentials before admitting account-management intents', () => {
    const started = transitionAccountAccess(resetAccountAccessState(), { kind: 'started' });

    expect(started.effects).toEqual([{ kind: 'loadAccountAccess', operationId: 1 }]);
    expect(transitionAccountAccess(started.state, { kind: 'invitationRequested' }).effects).toEqual(
      []
    );
  });

  it('replaces and revokes one narrow invitation access credential', () => {
    const creating = transitionAccountAccess(loadedState(), {
      kind: 'invitationAccessRequested',
    });
    const created = transitionAccountAccess(creating.state, {
      kind: 'invitationAccessCreated',
      operationId: 2,
      token: 'sp_inv_token',
      credential: { id: 'access-1', createdAt: 10, expiresAt: 20 },
    });
    expect(created.state).toMatchObject({
      invitationAccessToken: 'sp_inv_token',
      invitationAccess: { id: 'access-1' },
    });

    const revoking = transitionAccountAccess(created.state, {
      kind: 'invitationAccessRevocationRequested',
    });
    const revoked = transitionAccountAccess(revoking.state, {
      kind: 'invitationAccessRevoked',
      operationId: 3,
    });
    expect(revoked.state).toMatchObject({ invitationAccess: null, invitationAccessToken: null });
  });

  it('atomically removes a credential and emits a cross-feature output', () => {
    const revoking = transitionAccountAccess(loadedState(), {
      kind: 'credentialRevocationRequested',
      credentialId: 'laptop',
    });
    const completed = transitionAccountAccess(revoking.state, {
      kind: 'credentialRevoked',
      operationId: 2,
    });

    expect(completed.state.credentials.map(({ id }) => id)).toEqual(['phone']);
    expect(completed.outputs).toEqual([{ kind: 'credentialSetChanged' }]);
  });

  it('does not issue an effect that could remove the final credential', () => {
    const state = { ...loadedState(), credentials: credentials.slice(0, 1) };

    expect(
      transitionAccountAccess(state, {
        kind: 'credentialRevocationRequested',
        credentialId: 'phone',
      }).effects
    ).toEqual([]);
  });

  it('ignores results from an older operation epoch', () => {
    const state = loadedState();

    expect(
      transitionAccountAccess(state, {
        kind: 'invitationCreated',
        operationId: 1,
        code: 'STALE-CODE',
      }).state
    ).toBe(state);
  });
});
