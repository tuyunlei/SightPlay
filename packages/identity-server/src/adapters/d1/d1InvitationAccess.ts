import { accepted, failed } from '../../model/failure';
import {
  asAccountId,
  asInvitationAccessId,
  asSecretDigest,
  asTimestamp,
  type InvitationAccessRecord,
} from '../../model/types';
import type { IdentityStore } from '../../ports';

import type { D1DatabasePort } from './d1Types';

type InvitationAccessRow = {
  readonly id: string;
  readonly token_digest: string;
  readonly account_id: string;
  readonly created_at: number;
  readonly expires_at: number;
  readonly revoked_at: number | null;
};

export async function findD1InvitationAccess(
  db: D1DatabasePort,
  input: Parameters<IdentityStore['findInvitationAccess']>[0]
) {
  const row = await db
    .prepare(
      "SELECT t.id, t.token_digest, t.account_id, t.created_at, t.expires_at, t.revoked_at FROM invitation_access_credentials t JOIN accounts a ON a.id = t.account_id WHERE t.token_digest = ? AND t.revoked_at IS NULL AND t.expires_at > ? AND a.status = 'active'"
    )
    .bind(input.tokenDigest, input.now)
    .first<InvitationAccessRow>();
  return row ? accepted(toInvitationAccess(row)) : failed('authenticationRequired');
}

export async function getD1InvitationAccess(
  db: D1DatabasePort,
  accountId: Parameters<IdentityStore['getInvitationAccess']>[0],
  now: Parameters<IdentityStore['getInvitationAccess']>[1]
) {
  const row = await db
    .prepare(
      'SELECT id, token_digest, account_id, created_at, expires_at, revoked_at FROM invitation_access_credentials WHERE account_id = ? AND revoked_at IS NULL AND expires_at > ?'
    )
    .bind(accountId, now)
    .first<InvitationAccessRow>();
  return accepted(row ? toInvitationAccess(row) : null);
}

export async function replaceD1InvitationAccess(
  db: D1DatabasePort,
  input: Parameters<IdentityStore['replaceInvitationAccess']>[0]
) {
  try {
    await db.batch([
      db
        .prepare(
          'UPDATE invitation_access_credentials SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL'
        )
        .bind(input.now, input.credential.accountId),
      db
        .prepare(
          'INSERT INTO invitation_access_credentials (id, token_digest, account_id, created_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL)'
        )
        .bind(
          input.credential.id,
          input.credential.tokenDigest,
          input.credential.accountId,
          input.credential.createdAt,
          input.credential.expiresAt
        ),
    ]);
    return accepted(undefined);
  } catch {
    return failed('internal', true);
  }
}

export async function revokeD1InvitationAccess(
  db: D1DatabasePort,
  input: Parameters<IdentityStore['revokeInvitationAccess']>[0]
) {
  await db
    .prepare(
      'UPDATE invitation_access_credentials SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL'
    )
    .bind(input.now, input.accountId)
    .run();
  return accepted(undefined);
}

function toInvitationAccess(row: InvitationAccessRow): InvitationAccessRecord {
  return {
    id: asInvitationAccessId(row.id),
    tokenDigest: asSecretDigest(row.token_digest),
    accountId: asAccountId(row.account_id),
    createdAt: asTimestamp(row.created_at),
    expiresAt: asTimestamp(row.expires_at),
    revokedAt: row.revoked_at === null ? null : asTimestamp(row.revoked_at),
  };
}
