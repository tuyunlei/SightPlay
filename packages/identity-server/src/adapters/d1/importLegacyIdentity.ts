import type { LegacyIdentityImport } from '../../migration/legacyCredentials';
import { accepted, failed, type IdentityServerResult } from '../../model/failure';

import type { D1DatabasePort } from './d1Types';
import type { CredentialRow } from './rows';

export async function importLegacyIdentity(
  db: D1DatabasePort,
  input: LegacyIdentityImport
): Promise<IdentityServerResult<{ readonly imported: boolean }>> {
  const existing = await inspectExistingImport(db, input);
  if (existing === 'complete') return accepted({ imported: false });
  if (existing === 'conflict') return failed('credentialConflict');
  try {
    await db.batch([
      db
        .prepare('INSERT INTO accounts (id, status, created_at) VALUES (?, ?, ?)')
        .bind(input.account.id, input.account.status, input.account.createdAt),
      ...input.credentials.map((credential) =>
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
          )
      ),
    ]);
    return accepted({ imported: true });
  } catch {
    const afterFailure = await inspectExistingImport(db, input);
    return afterFailure === 'complete'
      ? accepted({ imported: false })
      : afterFailure === 'conflict'
        ? failed('credentialConflict')
        : failed('internal', true);
  }
}

async function inspectExistingImport(
  db: D1DatabasePort,
  input: LegacyIdentityImport
): Promise<'absent' | 'complete' | 'conflict'> {
  const account = await db
    .prepare('SELECT id, status, created_at FROM accounts WHERE id = ?')
    .bind(input.account.id)
    .first<{ readonly id: string; readonly status: string; readonly created_at: number }>();
  const rows = await db
    .prepare(
      'SELECT id, account_id, public_key, public_key_format, algorithm, counter, transports_json, name, created_at, revoked_at FROM credentials WHERE account_id = ? OR id IN (' +
        input.credentials.map(() => '?').join(',') +
        ') ORDER BY id'
    )
    .bind(input.account.id, ...input.credentials.map(({ id }) => id))
    .all<CredentialRow>();
  if (!account && rows.results.length === 0) return 'absent';
  if (
    !account ||
    account.status !== input.account.status ||
    account.created_at !== input.account.createdAt ||
    rows.results.length !== input.credentials.length
  ) {
    return 'conflict';
  }
  const expected = [...input.credentials].sort((first, second) =>
    first.id.localeCompare(second.id)
  );
  return rows.results.every((row, index) => credentialMatches(row, expected[index]))
    ? 'complete'
    : 'conflict';
}

function credentialMatches(
  row: CredentialRow,
  expected: LegacyIdentityImport['credentials'][number]
): boolean {
  return (
    row.id === expected.id &&
    row.account_id === expected.accountId &&
    row.public_key === expected.publicKey &&
    row.public_key_format === expected.publicKeyFormat &&
    row.algorithm === expected.algorithm &&
    row.counter === expected.counter &&
    row.transports_json === JSON.stringify(expected.transports) &&
    row.name === expected.name &&
    row.created_at === expected.createdAt &&
    row.revoked_at === null
  );
}
