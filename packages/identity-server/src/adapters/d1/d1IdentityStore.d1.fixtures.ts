import { env } from 'cloudflare:workers';

import {
  asAccountId,
  asCeremonyId,
  asCredentialId,
  asSecretDigest,
  asSessionId,
  asTimestamp,
  type AccountRecord,
  type CeremonyRecord,
  type CredentialRecord,
  type SessionRecord,
} from '../../model/types';

import { createD1IdentityStore } from './d1IdentityStore';
import type { D1DatabasePort } from './d1Types';

export const db = env.IDENTITY_DB as unknown as D1DatabasePort;
export const store = createD1IdentityStore(db);
export const now = asTimestamp(10_000);
export const invitation = asSecretDigest('invite-digest');

export function ceremony(id: string, challenge: string): CeremonyRecord {
  return {
    id: asCeremonyId(id),
    challengeDigest: asSecretDigest(challenge),
    kind: 'registration',
    accountId: asAccountId(`account-${id}`),
    invitationDigest: invitation,
    rpId: 'sightplay.example',
    origin: 'https://sightplay.example',
    expiresAt: asTimestamp(20_000),
    consumedAt: null,
  };
}

export function account(id: string): AccountRecord {
  return { id: asAccountId(id), status: 'active', createdAt: now };
}

export function credential(
  id: string,
  accountId: AccountRecord['id'],
  counter = 0
): CredentialRecord {
  return {
    id: asCredentialId(id),
    accountId,
    publicKey: `public-${id}`,
    publicKeyFormat: 'cose',
    algorithm: 'ES256',
    counter,
    transports: ['internal'],
    name: id,
    createdAt: now,
    revokedAt: null,
  };
}

export function session(id: string, accountId: AccountRecord['id']): SessionRecord {
  return {
    id: asSessionId(id),
    tokenDigest: asSecretDigest(`token-${id}`),
    accountId,
    createdAt: now,
    expiresAt: asTimestamp(30_000),
    revokedAt: null,
  };
}

export async function seedInvitation(digest = invitation) {
  await db
    .prepare(
      "INSERT INTO invitations (code_digest, purpose, issuer_account_id, expires_at, consumed_at, consumed_by_account_id) VALUES (?, 'createAccount', NULL, ?, NULL, NULL)"
    )
    .bind(digest, 20_000)
    .run();
}

export async function seedAccountAndCredential(
  accountRecord: AccountRecord,
  key: CredentialRecord
) {
  await db.batch([
    db
      .prepare('INSERT INTO accounts (id, status, created_at) VALUES (?, ?, ?)')
      .bind(accountRecord.id, accountRecord.status, accountRecord.createdAt),
    db
      .prepare(
        'INSERT INTO credentials (id, account_id, public_key, public_key_format, algorithm, counter, transports_json, name, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)'
      )
      .bind(
        key.id,
        key.accountId,
        key.publicKey,
        key.publicKeyFormat,
        key.algorithm,
        key.counter,
        JSON.stringify(key.transports),
        key.name,
        key.createdAt
      ),
  ]);
}

export async function scalar(query: string, ...bindings: unknown[]): Promise<number> {
  const row = await db
    .prepare(query)
    .bind(...bindings)
    .first<{ readonly value: number }>();
  return row?.value ?? 0;
}

export async function clearIdentityTables(): Promise<void> {
  await db.batch(
    [
      'DELETE FROM credential_revocation_claims',
      'DELETE FROM identity_bootstrap_claims',
      'DELETE FROM identity_rate_limits',
      'DELETE FROM authentication_claims',
      'DELETE FROM registration_claims',
      'DELETE FROM sessions',
      'DELETE FROM credentials',
      'DELETE FROM ceremonies',
      'DELETE FROM invitations',
      'DELETE FROM accounts',
    ].map((query) => db.prepare(query))
  );
}
