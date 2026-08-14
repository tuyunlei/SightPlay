import type { CompleteLoginCommand, CompleteRegistrationCommand } from '../../ports';

import type { D1DatabasePort, D1PreparedStatementPort } from './d1Types';

export function registrationStatements(
  db: D1DatabasePort,
  command: CompleteRegistrationCommand
): D1PreparedStatementPort[] {
  const { account, credential, session } = command;
  return [
    db
      .prepare(
        'INSERT INTO registration_claims (ceremony_id, invitation_digest, credential_id, claimed_at) VALUES (?, ?, ?, ?)'
      )
      .bind(command.ceremonyId, command.invitationDigest, credential.id, command.now),
    db
      .prepare('INSERT INTO accounts (id, status, created_at) VALUES (?, ?, ?)')
      .bind(account.id, account.status, account.createdAt),
    db
      .prepare(
        'INSERT INTO credentials (id, account_id, public_key, public_key_format, algorithm, counter, transports_json, name, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)'
      )
      .bind(
        credential.id,
        credential.accountId,
        credential.publicKey,
        credential.publicKeyFormat,
        credential.algorithm,
        credential.counter,
        JSON.stringify(credential.transports),
        credential.name,
        credential.createdAt
      ),
    db
      .prepare(
        'UPDATE invitations SET consumed_at = ?, consumed_by_account_id = ? WHERE code_digest = ?'
      )
      .bind(command.now, account.id, command.invitationDigest),
    db
      .prepare('UPDATE ceremonies SET consumed_at = ? WHERE id = ?')
      .bind(command.now, command.ceremonyId),
    insertSession(db, session),
  ];
}

export function authenticationStatements(
  db: D1DatabasePort,
  command: CompleteLoginCommand
): D1PreparedStatementPort[] {
  return [
    db
      .prepare(
        'INSERT INTO authentication_claims (ceremony_id, credential_id, next_counter, claimed_at) VALUES (?, ?, ?, ?)'
      )
      .bind(command.ceremonyId, command.credentialId, command.nextCounter, command.now),
    db
      .prepare('UPDATE credentials SET counter = ? WHERE id = ?')
      .bind(command.nextCounter, command.credentialId),
    db
      .prepare('UPDATE ceremonies SET consumed_at = ? WHERE id = ?')
      .bind(command.now, command.ceremonyId),
    insertSession(db, command.session),
  ];
}

function insertSession(
  db: D1DatabasePort,
  session: CompleteRegistrationCommand['session']
): D1PreparedStatementPort {
  return db
    .prepare(
      'INSERT INTO sessions (id, token_digest, account_id, created_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL)'
    )
    .bind(session.id, session.tokenDigest, session.accountId, session.createdAt, session.expiresAt);
}
