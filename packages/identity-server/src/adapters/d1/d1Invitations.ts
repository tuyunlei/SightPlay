import { accepted, failed } from '../../model/failure';
import type { IdentityStore } from '../../ports';

import type { D1DatabasePort } from './d1Types';

export async function createD1Invitations(
  db: D1DatabasePort,
  invitations: Parameters<IdentityStore['createInvitations']>[0]
) {
  try {
    await db.batch(
      invitations.map((invitation) =>
        db
          .prepare(
            'INSERT INTO invitations (code_digest, purpose, issuer_account_id, expires_at, consumed_at, consumed_by_account_id) VALUES (?, ?, ?, ?, NULL, NULL)'
          )
          .bind(
            invitation.codeDigest,
            invitation.purpose,
            invitation.issuerAccountId,
            invitation.expiresAt
          )
      )
    );
    return accepted(undefined);
  } catch {
    const existing = await Promise.all(
      invitations.map((invitation) =>
        db
          .prepare('SELECT code_digest FROM invitations WHERE code_digest = ?')
          .bind(invitation.codeDigest)
          .first<{ readonly code_digest: string }>()
      )
    );
    return existing.some(Boolean) ? failed('invitationConflict') : failed('internal', true);
  }
}

export async function bootstrapD1Invitations(
  db: D1DatabasePort,
  input: Parameters<IdentityStore['bootstrapInvitations']>[0]
) {
  try {
    await db.batch([
      db
        .prepare('INSERT INTO identity_bootstrap_claims (singleton, claimed_at) VALUES (1, ?)')
        .bind(input.claimedAt),
      ...input.invitations.map((invitation) =>
        db
          .prepare(
            'INSERT INTO invitations (code_digest, purpose, issuer_account_id, expires_at, consumed_at, consumed_by_account_id) VALUES (?, ?, NULL, ?, NULL, NULL)'
          )
          .bind(invitation.codeDigest, invitation.purpose, invitation.expiresAt)
      ),
    ]);
    return accepted(undefined);
  } catch {
    const state = await db
      .prepare(
        'SELECT EXISTS(SELECT 1 FROM identity_bootstrap_claims) AS claimed, EXISTS(SELECT 1 FROM accounts) AS accounts, EXISTS(SELECT 1 FROM invitations) AS invitations'
      )
      .first<{
        readonly claimed: number;
        readonly accounts: number;
        readonly invitations: number;
      }>();
    return state?.claimed === 1 || state?.accounts === 1 || state?.invitations === 1
      ? failed('authenticationRequired')
      : failed('internal', true);
  }
}
