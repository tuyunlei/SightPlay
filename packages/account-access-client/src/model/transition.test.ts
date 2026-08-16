import { describe, expect, it } from 'vitest';

import { resetAccountAccessState, transitionAccountAccess } from './transition';

const credentials = [
  { id: 'phone', name: 'Phone', createdAt: 1 },
  { id: 'laptop', name: 'Laptop', createdAt: 2 },
];

function loadedState() {
  const started = transitionAccountAccess(resetAccountAccessState(), { kind: 'started' });
  return transitionAccountAccess(started.state, {
    kind: 'credentialsLoaded',
    operationId: 1,
    credentials,
  }).state;
}

describe('Account Access transition', () => {
  it('loads credentials before admitting account-management intents', () => {
    const started = transitionAccountAccess(resetAccountAccessState(), { kind: 'started' });

    expect(started.effects).toEqual([{ kind: 'loadCredentials', operationId: 1 }]);
    expect(transitionAccountAccess(started.state, { kind: 'invitationRequested' }).effects).toEqual(
      []
    );
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
