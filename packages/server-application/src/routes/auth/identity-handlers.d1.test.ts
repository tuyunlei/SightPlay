import {
  decodeApiResult,
  decodeCredentialSummaries,
  decodeInvitationCodes,
  decodeIssuedInvitationAccess,
  decodeLoginOptions,
  decodeOperationCompleted,
  decodeSessionSnapshot,
} from '@sightplay/api-contracts';
import {
  createD1IdentityStore,
  createD1IdentityRateLimits,
  createSystemIdentityPorts,
  type D1DatabasePort,
} from '@sightplay/identity-server';
import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';

import type { PlatformContext } from '../../platform';

import { handleDeleteInvitationAccess, handlePostInvitationAccess } from './invitation-access';
import { handlePostInvite, handlePostInviteBootstrap } from './invite';
import { handlePostLoginOptions } from './login-options';
import { handleDeletePasskey, handleGetPasskeys } from './passkeys';
import { handlePostRegisterOptions } from './register-options';
import { handleGetSession } from './session';

const db = env.IDENTITY_DB as unknown as D1DatabasePort;
const store = createD1IdentityStore(db);
const rateLimits = createD1IdentityRateLimits(db);
const origin = 'https://sightplay.example';
const token = 'assembled-session-token';

const configuration: Record<string, string> = {
  WEBAUTHN_RP_ID: 'sightplay.example',
  WEBAUTHN_RP_NAME: 'SightPlay',
  IDENTITY_ALLOWED_ORIGINS: origin,
  WEBAUTHN_USER_VERIFICATION: 'required',
  IDENTITY_CEREMONY_TTL_MS: '300000',
  IDENTITY_INVITATION_TTL_MS: '604800000',
  IDENTITY_INVITATION_ACCESS_TTL_MS: '7776000000',
  IDENTITY_SESSION_TTL_MS: '604800000',
  IDENTITY_RATE_LIMIT_SOURCE_COUNT: '20',
  IDENTITY_RATE_LIMIT_SOURCE_WINDOW_MS: '60000',
  IDENTITY_RATE_LIMIT_CEREMONY_COUNT: '5',
  IDENTITY_RATE_LIMIT_CEREMONY_WINDOW_MS: '60000',
  IDENTITY_RATE_LIMIT_INVITATION_COUNT: '5',
  IDENTITY_RATE_LIMIT_INVITATION_WINDOW_MS: '60000',
  IDENTITY_RATE_LIMIT_ACCOUNT_COUNT: '10',
  IDENTITY_RATE_LIMIT_ACCOUNT_WINDOW_MS: '60000',
  IDENTITY_BOOTSTRAP_SECRET: 'bootstrap-secret-for-assembled-test',
};

function platform(
  path: string,
  init: RequestInit = {},
  environment: Readonly<Record<string, string>> = configuration
): PlatformContext {
  return {
    request: new Request(`${origin}${path}`, init),
    identityStore: store,
    identityRateLimits: rateLimits,
    clientAddress: '203.0.113.1',
    env: (key) => environment[key],
  };
}

async function seedAuthenticatedAccount(): Promise<void> {
  const now = Date.now();
  const digest = await createSystemIdentityPorts().secrets.digest(token);
  await db.batch([
    db
      .prepare("INSERT INTO accounts (id, status, created_at) VALUES ('account-1', 'active', ?)")
      .bind(now),
    ...['phone', 'laptop'].map((id) =>
      db
        .prepare(
          "INSERT INTO credentials (id, account_id, public_key, public_key_format, algorithm, counter, transports_json, name, created_at, revoked_at) VALUES (?, 'account-1', ?, 'cose', 'ES256', 0, '[\"internal\"]', ?, ?, NULL)"
        )
        .bind(id, `public-${id}`, id, now)
    ),
    db
      .prepare(
        "INSERT INTO sessions (id, token_digest, account_id, created_at, expires_at, revoked_at) VALUES ('session-1', ?, 'account-1', ?, ?, NULL)"
      )
      .bind(digest, now, now + 60_000),
  ]);
}

beforeEach(async () => {
  await db.batch(
    [
      'DELETE FROM credential_revocation_claims',
      'DELETE FROM identity_bootstrap_claims',
      'DELETE FROM identity_rate_limits',
      'DELETE FROM authentication_claims',
      'DELETE FROM registration_claims',
      'DELETE FROM sessions',
      'DELETE FROM invitation_access_credentials',
      'DELETE FROM credentials',
      'DELETE FROM ceremonies',
      'DELETE FROM invitations',
      'DELETE FROM accounts',
    ].map((query) => db.prepare(query))
  );
});

describe('Identity HTTP assembly over D1', () => {
  it('bootstraps an empty store only with the named one-time capability', async () => {
    const missingSecret = await handlePostInviteBootstrap(
      platform(
        '/api/auth/bootstrap/invitations',
        { method: 'POST', body: JSON.stringify({ count: 1 }) },
        { ...configuration, IDENTITY_BOOTSTRAP_SECRET: '' }
      )
    );
    expect(missingSecret.status).toBe(401);

    const wrongSecret = await handlePostInviteBootstrap(
      platform('/api/auth/bootstrap/invitations', {
        method: 'POST',
        headers: { 'X-Identity-Bootstrap-Secret': 'wrong-secret' },
        body: JSON.stringify({ count: 1 }),
      })
    );
    expect(wrongSecret.status).toBe(401);

    const created = await handlePostInviteBootstrap(
      platform('/api/auth/bootstrap/invitations', {
        method: 'POST',
        headers: {
          'X-Identity-Bootstrap-Secret': configuration.IDENTITY_BOOTSTRAP_SECRET,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 1 }),
      })
    );
    const decoded = decodeApiResult(await created.json(), decodeInvitationCodes);
    expect(decoded.ok && decoded.value.ok && decoded.value.data.codes).toHaveLength(1);
    expect(
      await db.prepare('SELECT COUNT(*) AS count FROM invitations').first<{ count: number }>()
    ).toEqual({ count: 1 });

    await seedAuthenticatedAccount();
    const closed = await handlePostInviteBootstrap(
      platform('/api/auth/bootstrap/invitations', {
        method: 'POST',
        headers: { 'X-Identity-Bootstrap-Secret': configuration.IDENTITY_BOOTSTRAP_SECRET },
      })
    );
    expect(closed.status).toBe(401);
    expect(
      await db.prepare('SELECT COUNT(*) AS count FROM invitations').first<{ count: number }>()
    ).toEqual({ count: 1 });
  });

  it('reports anonymous session state from the transactional store', async () => {
    const response = await handleGetSession(platform('/api/auth/session'));
    const decoded = decodeApiResult(await response.json(), decodeSessionSnapshot);

    expect(response.status).toBe(200);
    expect(decoded).toMatchObject({
      ok: true,
      value: { ok: true, data: { authenticated: false, hasPasskeys: false } },
    });
  });

  it('treats a malformed session cookie as anonymous input instead of an internal failure', async () => {
    const response = await handleGetSession(
      platform('/api/auth/session', { headers: { Cookie: 'sightplay_session=%' } })
    );
    const decoded = decodeApiResult(await response.json(), decodeSessionSnapshot);

    expect(response.status).toBe(200);
    expect(decoded).toMatchObject({
      ok: true,
      value: { ok: true, data: { authenticated: false, hasPasskeys: false } },
    });
  });

  it('rejects malformed registration input before it reaches a ceremony', async () => {
    const response = await handlePostRegisterOptions(
      platform('/api/auth/register-options', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite: 'wrong-field' }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'invalidRequest', retryable: false },
    });
  });

  it('admits only generated Preview origins owned by the SightPlay Pages project', async () => {
    await seedAuthenticatedAccount();
    const previewConfiguration = {
      ...configuration,
      WEBAUTHN_RP_ID: 'sightplay.pages.dev',
      IDENTITY_ALLOWED_ORIGINS: '',
      IDENTITY_ALLOWED_HTTPS_SUBDOMAIN_SUFFIXES: 'sightplay.pages.dev',
    };
    const request = (requestOrigin: string) =>
      platform(
        '/api/auth/register-options',
        {
          method: 'POST',
          headers: { Origin: requestOrigin, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode: 'ABCD-EFGH' }),
        },
        previewConfiguration
      );

    const login = await handlePostLoginOptions(
      platform(
        '/api/auth/login-options',
        { method: 'POST', headers: { Origin: 'https://80827304.sightplay.pages.dev' } },
        previewConfiguration
      )
    );
    const loginResult = decodeApiResult(await login.json(), decodeLoginOptions);
    expect(loginResult).toMatchObject({
      ok: true,
      value: { ok: true, data: { rpId: 'sightplay.pages.dev' } },
    });

    const admitted = await handlePostRegisterOptions(
      request('https://80827304.sightplay.pages.dev')
    );
    expect(admitted.status).toBe(400);
    expect(await admitted.json()).toMatchObject({ error: { code: 'invitationInvalid' } });

    const rejected = await handlePostRegisterOptions(request('https://80827304.other.pages.dev'));
    expect(rejected.status).toBe(403);
    expect(await rejected.json()).toMatchObject({ error: { code: 'originRejected' } });
  });

  it('authenticates account management and preserves the final credential invariant', async () => {
    await seedAuthenticatedAccount();
    const headers = { Cookie: `sightplay_session=${token}`, Origin: origin };
    const listed = await handleGetPasskeys(platform('/api/auth/passkeys', { headers }));
    const listResult = decodeApiResult(await listed.json(), decodeCredentialSummaries);
    expect(listResult.ok && listResult.value.ok && listResult.value.data).toHaveLength(2);

    const removed = await handleDeletePasskey(
      platform('/api/auth/passkeys?id=laptop', { method: 'DELETE', headers })
    );
    expect(decodeApiResult(await removed.json(), decodeOperationCompleted)).toMatchObject({
      ok: true,
      value: { ok: true, data: { completed: true } },
    });

    const rejected = await handleDeletePasskey(
      platform('/api/auth/passkeys?id=phone', { method: 'DELETE', headers })
    );
    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toMatchObject({
      ok: false,
      error: { code: 'lastCredential', retryable: false },
    });
  });

  it('issues, rotates, and revokes invitation-only CLI access through the same invite use case', async () => {
    await seedAuthenticatedAccount();
    const sessionHeaders = { Cookie: `sightplay_session=${token}`, Origin: origin };
    const issue = async () => {
      const response = await handlePostInvitationAccess(
        platform('/api/auth/invitation-access', { method: 'POST', headers: sessionHeaders })
      );
      const decoded = decodeApiResult(await response.json(), decodeIssuedInvitationAccess);
      if (!decoded.ok || !decoded.value.ok) throw new Error('failed invitation access fixture');
      return decoded.value.data.token;
    };
    const createInvite = (accessToken: string) =>
      handlePostInvite(
        platform('/api/auth/invite', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ count: 1 }),
        })
      );

    const first = await issue();
    const created = await createInvite(first);
    expect(decodeApiResult(await created.json(), decodeInvitationCodes)).toMatchObject({
      ok: true,
      value: { ok: true, data: { codes: [expect.stringMatching(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)] } },
    });

    const replacement = await issue();
    expect((await createInvite(first)).status).toBe(401);
    expect((await createInvite(replacement)).status).toBe(200);

    const revoked = await handleDeleteInvitationAccess(
      platform('/api/auth/invitation-access', { method: 'DELETE', headers: sessionHeaders })
    );
    expect(revoked.status).toBe(200);
    expect((await createInvite(replacement)).status).toBe(401);
  });

  it('rejects a credential mutation from an unapproved origin', async () => {
    await seedAuthenticatedAccount();
    const response = await handleDeletePasskey(
      platform('/api/auth/passkeys?id=laptop', {
        method: 'DELETE',
        headers: { Cookie: `sightplay_session=${token}`, Origin: 'https://attacker.example' },
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'originRejected', retryable: false },
    });
  });
});
