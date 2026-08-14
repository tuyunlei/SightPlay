import { failed, type IdentityServerResult } from '../../model/failure';
import type { CredentialId, SecretDigest, Timestamp } from '../../model/types';

import type { D1DatabasePort } from './d1Types';
import type { CeremonyRow, CredentialRow, InvitationRow } from './rows';

export async function inspectInvitation(
  db: D1DatabasePort,
  digest: SecretDigest,
  now: Timestamp
): Promise<IdentityServerResult<InvitationRow>> {
  const row = await db
    .prepare('SELECT expires_at, consumed_at FROM invitations WHERE code_digest = ?')
    .bind(digest)
    .first<InvitationRow>();
  if (!row) return failed('invitationInvalid');
  if (row.consumed_at !== null) return failed('invitationUsed');
  if (row.expires_at <= now) return failed('invitationExpired');
  return { ok: true, value: row };
}

export async function classifyRegistrationFailure(
  db: D1DatabasePort,
  input: {
    readonly ceremonyId: string;
    readonly invitationDigest: SecretDigest;
    readonly credentialId: CredentialId;
    readonly now: Timestamp;
  }
) {
  const ceremony = await db
    .prepare('SELECT consumed_at, expires_at FROM ceremonies WHERE id = ?')
    .bind(input.ceremonyId)
    .first<Pick<CeremonyRow, 'consumed_at' | 'expires_at'>>();
  if (!ceremony) return failed('ceremonyInvalid');
  if (ceremony.consumed_at !== null) return failed('ceremonyReplayed');
  if (ceremony.expires_at <= input.now) return failed('ceremonyExpired');
  const invitation = await inspectInvitation(db, input.invitationDigest, input.now);
  if (!invitation.ok) return invitation;
  const duplicate = await db
    .prepare('SELECT id FROM credentials WHERE id = ?')
    .bind(input.credentialId)
    .first<{ readonly id: string }>();
  return duplicate ? failed('credentialConflict') : failed('internal', true);
}

export async function classifyAuthenticationFailure(
  db: D1DatabasePort,
  input: {
    readonly ceremonyId: string;
    readonly credentialId: CredentialId;
    readonly nextCounter: number;
    readonly now: Timestamp;
  }
) {
  const ceremony = await db
    .prepare('SELECT consumed_at, expires_at FROM ceremonies WHERE id = ?')
    .bind(input.ceremonyId)
    .first<Pick<CeremonyRow, 'consumed_at' | 'expires_at'>>();
  if (!ceremony) return failed('ceremonyInvalid');
  if (ceremony.consumed_at !== null) return failed('ceremonyReplayed');
  if (ceremony.expires_at <= input.now) return failed('ceremonyExpired');
  const credential = await db
    .prepare('SELECT counter, revoked_at FROM credentials WHERE id = ?')
    .bind(input.credentialId)
    .first<Pick<CredentialRow, 'counter' | 'revoked_at'>>();
  if (!credential || credential.revoked_at !== null) return failed('credentialNotFound');
  return credential.counter > input.nextCounter
    ? failed('counterRegression')
    : failed('internal', true);
}
