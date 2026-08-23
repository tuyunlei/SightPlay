import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';

import { decodeLegacyCredentialExport } from '../../migration/legacyCredentials';

import type { D1DatabasePort } from './d1Types';
import { importLegacyIdentity } from './importLegacyIdentity';

const db = env.IDENTITY_DB as unknown as D1DatabasePort;
const exported = [
  {
    id: 'legacy-phone',
    publicKey: 'spki-phone',
    counter: 4,
    name: 'Phone',
    createdAt: 1000,
    transports: ['internal'],
    algorithm: 'ES256',
  },
  {
    id: 'legacy-laptop',
    publicKey: 'spki-laptop',
    counter: 2,
    name: 'Laptop',
    createdAt: 2000,
    transports: ['hybrid'],
    algorithm: 'ES256',
  },
];

beforeEach(async () => {
  await db.batch(
    [
      'DELETE FROM credential_revocation_claims',
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

describe('legacy Identity D1 migration', () => {
  it('imports one explicit account and preserves the legacy SPKI credential representation', async () => {
    const decoded = decodeLegacyCredentialExport(exported);
    if (!decoded.ok) throw new Error('fixture must decode');

    expect(await importLegacyIdentity(db, decoded.value)).toEqual({
      ok: true,
      value: { imported: true },
    });
    expect(
      await db
        .prepare(
          "SELECT COUNT(*) AS count FROM credentials WHERE account_id = 'legacy-owner' AND public_key_format = 'spki'"
        )
        .first()
    ).toEqual({ count: 2 });
  });

  it('is idempotent only when every persisted field equals the decoded export', async () => {
    const decoded = decodeLegacyCredentialExport(exported);
    if (!decoded.ok) throw new Error('fixture must decode');
    await importLegacyIdentity(db, decoded.value);

    expect(await importLegacyIdentity(db, decoded.value)).toEqual({
      ok: true,
      value: { imported: false },
    });
    await db.prepare("UPDATE credentials SET counter = 99 WHERE id = 'legacy-phone'").run();
    expect(await importLegacyIdentity(db, decoded.value)).toEqual({
      ok: false,
      failure: { code: 'credentialConflict', retryable: false },
    });
  });

  it('writes no target account when any credential identifier already belongs elsewhere', async () => {
    await db.batch([
      db.prepare("INSERT INTO accounts VALUES ('other', 'active', 1)"),
      db.prepare(
        "INSERT INTO credentials VALUES ('legacy-laptop', 'other', 'different', 'spki', 'ES256', 0, '[]', 'Other', 1, NULL)"
      ),
    ]);
    const decoded = decodeLegacyCredentialExport(exported);
    if (!decoded.ok) throw new Error('fixture must decode');

    expect(await importLegacyIdentity(db, decoded.value)).toMatchObject({
      ok: false,
      failure: { code: 'credentialConflict' },
    });
    expect(
      await db.prepare("SELECT id FROM accounts WHERE id = 'legacy-owner'").first()
    ).toBeNull();
  });
});
