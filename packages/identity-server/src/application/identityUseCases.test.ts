import { describe, expect, it, vi } from 'vitest';

import { accepted, failed } from '../model/failure';
import {
  asAccountId,
  asCeremonyId,
  asCredentialId,
  asInvitationAccessId,
  asSecretDigest,
  asSessionId,
  asTimestamp,
  type CeremonyRecord,
  type CredentialRecord,
} from '../model/types';
import type {
  AuthenticationContext,
  IdentityStore,
  RegistrationVerification,
  WebAuthnServerPort,
} from '../ports';

import { beginRegistration } from './beginRegistration';
import { completeAuthentication } from './completeAuthentication';
import { completeRegistration } from './completeRegistration';
import type { IdentityUseCaseDependencies } from './dependencies';
import {
  authenticateInvitationAccess,
  createInvitationAccess,
  getInvitationAccess,
  revokeInvitationAccess,
} from './invitationAccess';
import { bootstrapInvitations } from './invitations';

const NOW = asTimestamp(1_000);
const ACCOUNT_ID = asAccountId('account-1');
const CEREMONY_ID = asCeremonyId('ceremony-1');
const INVITATION_DIGEST = asSecretDigest('digest:ABCDEFGH');
const CHALLENGE_DIGEST = asSecretDigest('digest:challenge-1');

function registrationCeremony(): CeremonyRecord {
  return {
    id: CEREMONY_ID,
    challengeDigest: CHALLENGE_DIGEST,
    kind: 'registration',
    accountId: ACCOUNT_ID,
    invitationDigest: INVITATION_DIGEST,
    rpId: 'sightplay.example',
    origin: 'https://sightplay.example',
    expiresAt: asTimestamp(61_000),
    consumedAt: null,
  };
}

function credential(counter = 1): CredentialRecord {
  return {
    id: asCredentialId('credential-1'),
    accountId: ACCOUNT_ID,
    publicKey: 'public-key',
    publicKeyFormat: 'cose',
    algorithm: 'ES256',
    counter,
    transports: ['internal'],
    name: 'Laptop',
    createdAt: NOW,
    revokedAt: null,
  };
}

function createStore(): IdentityStore {
  return {
    hasCredentials: vi.fn(async () => accepted(true)),
    validateInvitation: vi.fn(async () => accepted({ expiresAt: asTimestamp(20_000) })),
    beginRegistration: vi.fn(async () => accepted(undefined)),
    createInvitations: vi.fn(async () => accepted(undefined)),
    bootstrapInvitations: vi.fn(async () => accepted(undefined)),
    findRegistrationContext: vi.fn(async () => accepted({ ceremony: registrationCeremony() })),
    completeRegistration: vi.fn(async () => accepted(undefined)),
    beginAuthentication: vi.fn(async () => accepted([credential()])),
    findAuthenticationContext: vi.fn(async () =>
      accepted<AuthenticationContext>({
        ceremony: { ...registrationCeremony(), kind: 'authentication', invitationDigest: null },
        credential: credential(),
      })
    ),
    completeAuthentication: vi.fn(async () => accepted(undefined)),
    findSession: vi.fn(async () => failed('sessionInvalid')),
    revokeSession: vi.fn(async () => accepted(undefined)),
    listCredentials: vi.fn(async () => accepted([credential()])),
    revokeCredential: vi.fn(async () => accepted(undefined)),
    findInvitationAccess: vi.fn(async () => failed('authenticationRequired')),
    getInvitationAccess: vi.fn(async () => accepted(null)),
    replaceInvitationAccess: vi.fn(async () => accepted(undefined)),
    revokeInvitationAccess: vi.fn(async () => accepted(undefined)),
  };
}

function createWebAuthn(): WebAuthnServerPort {
  return {
    encodeUserHandle: (accountId) => `encoded:${accountId}`,
    readRegistrationChallenge: () => accepted('challenge-1'),
    readAuthenticationEnvelope: () =>
      accepted({ challenge: 'challenge-1', credentialId: asCredentialId('credential-1') }),
    verifyRegistration: vi.fn(async () =>
      accepted<RegistrationVerification>({
        credentialId: asCredentialId('credential-1'),
        publicKey: 'public-key',
        publicKeyFormat: 'cose',
        algorithm: 'ES256',
        counter: 1,
        transports: ['internal'],
        authenticatorName: 'Platform authenticator',
      })
    ),
    verifyAuthentication: vi.fn(async () => accepted({ counter: 2 })),
  };
}

function createDependencies(
  overrides: Partial<Pick<IdentityUseCaseDependencies, 'rateLimits' | 'store' | 'webAuthn'>> = {}
): IdentityUseCaseDependencies {
  return {
    clock: { now: () => NOW },
    ids: {
      createAccountId: () => ACCOUNT_ID,
      createCeremonyId: () => CEREMONY_ID,
      createSessionId: () => asSessionId('session-1'),
      createInvitationAccessId: () => asInvitationAccessId('invitation-access-1'),
    },
    secrets: {
      createChallenge: () => 'challenge-1',
      createInvitationCode: () => 'ABCD-EFGH',
      createInvitationAccessToken: () => 'sp_inv_raw-token',
      createSessionToken: () => 'raw-session-token',
      digest: async (value) => asSecretDigest(`digest:${value}`),
    },
    policy: {
      rpId: 'sightplay.example',
      rpName: 'SightPlay',
      allowedOrigins: ['https://sightplay.example'],
      allowedHttpsSubdomainSuffixes: [],
      userVerification: 'required',
      ceremonyTtlMs: 60_000,
      invitationTtlMs: 604_800_000,
      invitationAccessTtlMs: 7_776_000_000,
      sessionTtlMs: 604_800_000,
      rateLimits: {
        source: { limit: 20, windowMs: 60_000 },
        ceremony: { limit: 5, windowMs: 60_000 },
        invitation: { limit: 5, windowMs: 60_000 },
        account: { limit: 10, windowMs: 60_000 },
      },
    },
    rateLimits: overrides.rateLimits ?? { consume: vi.fn(async () => accepted(undefined)) },
    store: overrides.store ?? createStore(),
    webAuthn: overrides.webAuthn ?? createWebAuthn(),
  };
}

describe('Identity Server use cases', () => {
  it('issues one hashed invitation-only credential and can revoke it', async () => {
    const store = createStore();
    const dependencies = createDependencies({ store });
    const issued = await createInvitationAccess(ACCOUNT_ID, dependencies);

    expect(issued).toMatchObject({
      ok: true,
      value: {
        token: 'sp_inv_raw-token',
        credential: { id: 'invitation-access-1', createdAt: NOW },
      },
    });
    expect(store.replaceInvitationAccess).toHaveBeenCalledWith({
      now: NOW,
      credential: expect.objectContaining({
        tokenDigest: 'digest:sp_inv_raw-token',
        accountId: ACCOUNT_ID,
      }),
    });

    const record = vi.mocked(store.replaceInvitationAccess).mock.calls[0][0].credential;
    vi.mocked(store.getInvitationAccess).mockResolvedValue(accepted(record));
    vi.mocked(store.findInvitationAccess).mockResolvedValue(accepted(record));
    expect(await getInvitationAccess(ACCOUNT_ID, dependencies)).toMatchObject({
      ok: true,
      value: { id: 'invitation-access-1' },
    });
    expect(await authenticateInvitationAccess('sp_inv_raw-token', dependencies)).toEqual({
      ok: true,
      value: { accountId: ACCOUNT_ID },
    });

    expect(await revokeInvitationAccess(ACCOUNT_ID, dependencies)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(store.revokeInvitationAccess).toHaveBeenCalledWith({ accountId: ACCOUNT_ID, now: NOW });
  });

  it('commits invitation bootstrap through its dedicated atomic store command', async () => {
    const store = createStore();
    const dependencies = createDependencies({ store });

    const result = await bootstrapInvitations({ count: 1 }, dependencies);

    expect(result).toEqual(accepted(['ABCD-EFGH']));
    expect(store.bootstrapInvitations).toHaveBeenCalledWith({
      claimedAt: NOW,
      invitations: [expect.objectContaining({ issuerAccountId: null })],
    });
    expect(store.createInvitations).not.toHaveBeenCalled();
  });

  it('rejects an untrusted origin before creating a ceremony or challenge', async () => {
    const dependencies = createDependencies();

    const result = await beginRegistration(
      { inviteCode: 'ABCD-EFGH', origin: 'https://attacker.example', source: 'source-1' },
      dependencies
    );

    expect(result).toEqual(failed('originRejected'));
    expect(dependencies.store.beginRegistration).not.toHaveBeenCalled();
  });

  it('stores only challenge and invitation digests before returning registration options', async () => {
    const dependencies = createDependencies();

    const result = await beginRegistration(
      { inviteCode: 'abcd-efgh', origin: 'https://sightplay.example', source: 'source-1' },
      dependencies
    );

    expect(result.ok && result.value.user.id).toBe('encoded:account-1');
    expect(dependencies.store.beginRegistration).toHaveBeenCalledWith({
      now: NOW,
      ceremony: expect.objectContaining({
        challengeDigest: CHALLENGE_DIGEST,
        invitationDigest: INVITATION_DIGEST,
        accountId: ACCOUNT_ID,
      }),
    });
  });

  it('rejects a rate-limited source before constructing registration secrets or store state', async () => {
    const rateLimits = { consume: vi.fn(async () => failed('rateLimited', true)) };
    const dependencies = createDependencies({ rateLimits });

    const result = await beginRegistration(
      { inviteCode: 'ABCD-EFGH', origin: 'https://sightplay.example', source: 'source-1' },
      dependencies
    );

    expect(result).toEqual(failed('rateLimited', true));
    expect(dependencies.store.beginRegistration).not.toHaveBeenCalled();
  });

  it('returns a session token only after registration commits atomically', async () => {
    const store = createStore();
    vi.mocked(store.completeRegistration).mockResolvedValue(failed('invitationUsed'));
    const dependencies = createDependencies({ store });

    const rejected = await completeRegistration(
      {
        inviteCode: 'ABCD-EFGH',
        origin: 'https://sightplay.example',
        source: 'source-1',
        response: { id: 'credential-1' },
      },
      dependencies
    );

    expect(rejected).toEqual(failed('invitationUsed'));
    vi.mocked(store.completeRegistration).mockResolvedValue(accepted(undefined));
    const committed = await completeRegistration(
      {
        inviteCode: 'ABCD-EFGH',
        origin: 'https://sightplay.example',
        source: 'source-1',
        response: { id: 'credential-1' },
      },
      dependencies
    );
    expect(committed.ok && committed.value.token).toBe('raw-session-token');
  });

  it('rejects a regressing authenticator counter before the transactional write', async () => {
    const store = createStore();
    vi.mocked(store.findAuthenticationContext).mockResolvedValue(
      accepted({
        ceremony: { ...registrationCeremony(), kind: 'authentication', invitationDigest: null },
        credential: credential(10),
      })
    );
    const webAuthn = createWebAuthn();
    vi.mocked(webAuthn.verifyAuthentication).mockResolvedValue(accepted({ counter: 9 }));
    const dependencies = createDependencies({ store, webAuthn });

    const result = await completeAuthentication(
      {
        origin: 'https://sightplay.example',
        source: 'source-1',
        response: { id: 'credential-1' },
      },
      dependencies
    );

    expect(result).toEqual(failed('counterRegression'));
    expect(store.completeAuthentication).not.toHaveBeenCalled();
  });
});
