import { accepted, failed, type IdentityServerResult } from '../../model/failure';
import { asTimestamp } from '../../model/types';
import type { AccountId, CredentialRecord } from '../../model/types';
import type {
  AuthenticationContext,
  CompleteLoginCommand,
  CompleteRegistrationCommand,
  IdentityStore,
  RegistrationContext,
} from '../../ports';

import {
  classifyAuthenticationFailure,
  classifyRegistrationFailure,
  inspectInvitation,
} from './classify';
import {
  findD1InvitationAccess,
  getD1InvitationAccess,
  replaceD1InvitationAccess,
  revokeD1InvitationAccess,
} from './d1InvitationAccess';
import { bootstrapD1Invitations, createD1Invitations } from './d1Invitations';
import type { D1DatabasePort } from './d1Types';
import {
  toCeremony,
  toCredential,
  toSession,
  type CeremonyRow,
  type CredentialRow,
  type SessionRow,
} from './rows';
import { authenticationStatements, registrationStatements } from './statements';

export class D1IdentityStore implements IdentityStore {
  constructor(private readonly db: D1DatabasePort) {}

  async hasCredentials() {
    const row = await this.db
      .prepare('SELECT EXISTS(SELECT 1 FROM credentials WHERE revoked_at IS NULL) AS value')
      .first<{ readonly value: number }>();
    return accepted(row?.value === 1);
  }

  async validateInvitation(input: Parameters<IdentityStore['validateInvitation']>[0]) {
    const invitation = await inspectInvitation(this.db, input.invitationDigest, input.now);
    return invitation.ok
      ? accepted({ expiresAt: asTimestamp(invitation.value.expires_at) })
      : invitation;
  }

  async createInvitations(invitations: Parameters<IdentityStore['createInvitations']>[0]) {
    return createD1Invitations(this.db, invitations);
  }

  async bootstrapInvitations(input: Parameters<IdentityStore['bootstrapInvitations']>[0]) {
    return bootstrapD1Invitations(this.db, input);
  }

  async beginRegistration(input: Parameters<IdentityStore['beginRegistration']>[0]) {
    if (input.ceremony.invitationDigest === null) return failed('invitationInvalid');
    const invitation = await inspectInvitation(this.db, input.ceremony.invitationDigest, input.now);
    if (!invitation.ok) return invitation;
    try {
      await this.insertCeremony(input.now, input.ceremony).run();
      return accepted(undefined);
    } catch {
      return failed('internal', true);
    }
  }

  async findRegistrationContext(
    input: Parameters<IdentityStore['findRegistrationContext']>[0]
  ): Promise<IdentityServerResult<RegistrationContext>> {
    const invitation = await inspectInvitation(this.db, input.invitationDigest, input.now);
    if (!invitation.ok) return invitation;
    const row = await this.db
      .prepare(
        "SELECT id, challenge_digest, kind, account_id, invitation_digest, rp_id, origin, expires_at, consumed_at FROM ceremonies WHERE challenge_digest = ? AND invitation_digest = ? AND kind = 'registration'"
      )
      .bind(input.challengeDigest, input.invitationDigest)
      .first<CeremonyRow>();
    if (!row) return failed('ceremonyInvalid');
    if (row.consumed_at !== null) return failed('ceremonyReplayed');
    if (row.expires_at <= input.now) return failed('ceremonyExpired');
    const ceremony = toCeremony(row);
    return ceremony.ok ? accepted({ ceremony: ceremony.value }) : ceremony;
  }

  async completeRegistration(command: CompleteRegistrationCommand) {
    try {
      await this.db.batch(registrationStatements(this.db, command));
      return accepted(undefined);
    } catch {
      return classifyRegistrationFailure(this.db, {
        ceremonyId: command.ceremonyId,
        invitationDigest: command.invitationDigest,
        credentialId: command.credential.id,
        now: command.now,
      });
    }
  }

  async beginAuthentication(input: Parameters<IdentityStore['beginAuthentication']>[0]) {
    const credentials = await this.readActiveCredentials();
    if (!credentials.ok) return credentials;
    if (credentials.value.length === 0) return failed('credentialNotFound');
    try {
      await this.insertCeremony(input.now, input.ceremony).run();
      return credentials;
    } catch {
      return failed('internal', true);
    }
  }

  async findAuthenticationContext(
    input: Parameters<IdentityStore['findAuthenticationContext']>[0]
  ): Promise<IdentityServerResult<AuthenticationContext>> {
    const ceremonyRow = await this.db
      .prepare(
        "SELECT id, challenge_digest, kind, account_id, invitation_digest, rp_id, origin, expires_at, consumed_at FROM ceremonies WHERE challenge_digest = ? AND kind = 'authentication'"
      )
      .bind(input.challengeDigest)
      .first<CeremonyRow>();
    if (!ceremonyRow) return failed('ceremonyInvalid');
    if (ceremonyRow.consumed_at !== null) return failed('ceremonyReplayed');
    if (ceremonyRow.expires_at <= input.now) return failed('ceremonyExpired');
    const credentialRow = await this.readCredential(input.credentialId);
    if (!credentialRow || credentialRow.revoked_at !== null) return failed('credentialNotFound');
    const ceremony = toCeremony(ceremonyRow);
    const credential = toCredential(credentialRow);
    return ceremony.ok && credential.ok
      ? accepted({ ceremony: ceremony.value, credential: credential.value })
      : failed('internal');
  }

  async completeAuthentication(command: CompleteLoginCommand) {
    try {
      await this.db.batch(authenticationStatements(this.db, command));
      return accepted(undefined);
    } catch {
      return classifyAuthenticationFailure(this.db, {
        ceremonyId: command.ceremonyId,
        credentialId: command.credentialId,
        nextCounter: command.nextCounter,
        now: command.now,
      });
    }
  }

  async findSession(input: Parameters<IdentityStore['findSession']>[0]) {
    const row = await this.db
      .prepare(
        'SELECT id, token_digest, account_id, created_at, expires_at, revoked_at FROM sessions WHERE token_digest = ?'
      )
      .bind(input.tokenDigest)
      .first<SessionRow>();
    return row && row.revoked_at === null && row.expires_at > input.now
      ? accepted(toSession(row))
      : failed('sessionInvalid');
  }

  async revokeSession(input: Parameters<IdentityStore['revokeSession']>[0]) {
    const result = await this.db
      .prepare(
        'UPDATE sessions SET revoked_at = ? WHERE token_digest = ? AND revoked_at IS NULL AND expires_at > ?'
      )
      .bind(input.now, input.tokenDigest, input.now)
      .run();
    return result.meta.changes === 1 ? accepted(undefined) : failed('sessionInvalid');
  }

  async listCredentials(accountId: AccountId) {
    return this.readActiveCredentials(accountId);
  }

  async revokeCredential(input: Parameters<IdentityStore['revokeCredential']>[0]) {
    try {
      await this.db.batch([
        this.db
          .prepare(
            'INSERT INTO credential_revocation_claims (credential_id, account_id, claimed_at) VALUES (?, ?, ?)'
          )
          .bind(input.credentialId, input.accountId, input.now),
        this.db
          .prepare('UPDATE credentials SET revoked_at = ? WHERE id = ? AND account_id = ?')
          .bind(input.now, input.credentialId, input.accountId),
      ]);
      return accepted(undefined);
    } catch {
      return this.classifyCredentialRevocation(input);
    }
  }

  async findInvitationAccess(input: Parameters<IdentityStore['findInvitationAccess']>[0]) {
    return findD1InvitationAccess(this.db, input);
  }

  async getInvitationAccess(
    accountId: Parameters<IdentityStore['getInvitationAccess']>[0],
    now: Parameters<IdentityStore['getInvitationAccess']>[1]
  ) {
    return getD1InvitationAccess(this.db, accountId, now);
  }

  async replaceInvitationAccess(input: Parameters<IdentityStore['replaceInvitationAccess']>[0]) {
    return replaceD1InvitationAccess(this.db, input);
  }

  async revokeInvitationAccess(input: Parameters<IdentityStore['revokeInvitationAccess']>[0]) {
    return revokeD1InvitationAccess(this.db, input);
  }

  private insertCeremony(
    now: number,
    ceremony: Parameters<IdentityStore['beginRegistration']>[0]['ceremony']
  ) {
    return this.db
      .prepare(
        'INSERT INTO ceremonies (id, challenge_digest, kind, account_id, invitation_digest, rp_id, origin, created_at, expires_at, consumed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)'
      )
      .bind(
        ceremony.id,
        ceremony.challengeDigest,
        ceremony.kind,
        ceremony.accountId,
        ceremony.invitationDigest,
        ceremony.rpId,
        ceremony.origin,
        now,
        ceremony.expiresAt
      );
  }

  private async readCredential(id: string) {
    return this.db
      .prepare(
        'SELECT id, account_id, public_key, public_key_format, algorithm, counter, transports_json, name, created_at, revoked_at FROM credentials WHERE id = ?'
      )
      .bind(id)
      .first<CredentialRow>();
  }

  private async readActiveCredentials(
    accountId?: AccountId
  ): Promise<IdentityServerResult<readonly CredentialRecord[]>> {
    const query = accountId
      ? this.db
          .prepare(
            'SELECT id, account_id, public_key, public_key_format, algorithm, counter, transports_json, name, created_at, revoked_at FROM credentials WHERE revoked_at IS NULL AND account_id = ? ORDER BY created_at'
          )
          .bind(accountId)
      : this.db.prepare(
          'SELECT id, account_id, public_key, public_key_format, algorithm, counter, transports_json, name, created_at, revoked_at FROM credentials WHERE revoked_at IS NULL ORDER BY created_at'
        );
    const rows = await query.all<CredentialRow>();
    const credentials = rows.results.map(toCredential);
    return credentials.every((item) => item.ok)
      ? accepted(credentials.flatMap((item) => (item.ok ? [item.value] : [])))
      : failed('internal');
  }

  private async classifyCredentialRevocation(
    input: Parameters<IdentityStore['revokeCredential']>[0]
  ) {
    const credential = await this.readCredential(input.credentialId);
    if (
      !credential ||
      credential.account_id !== input.accountId ||
      credential.revoked_at !== null
    ) {
      return failed('credentialNotFound');
    }
    const count = await this.db
      .prepare(
        'SELECT COUNT(*) AS count FROM credentials WHERE account_id = ? AND revoked_at IS NULL'
      )
      .bind(input.accountId)
      .first<{ readonly count: number }>();
    return (count?.count ?? 0) <= 1 ? failed('lastCredential') : failed('internal', true);
  }
}

export function createD1IdentityStore(db: D1DatabasePort): IdentityStore {
  return new D1IdentityStore(db);
}
