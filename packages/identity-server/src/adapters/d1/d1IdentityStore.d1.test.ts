import { beforeEach, describe, expect, it } from 'vitest';

import { asSecretDigest, asSessionId, type CeremonyRecord } from '../../model/types';

import {
  account,
  ceremony,
  clearIdentityTables,
  credential,
  db,
  invitation,
  now,
  scalar,
  seedAccountAndCredential,
  seedInvitation,
  session,
  store,
} from './d1IdentityStore.d1.fixtures';

beforeEach(clearIdentityTables);

describe('D1 IdentityStore transaction contract', () => {
  it('allows exactly one concurrent registration to consume an invitation', async () => {
    await seedInvitation();
    const firstCeremony = ceremony('registration-a', 'challenge-a');
    const secondCeremony = ceremony('registration-b', 'challenge-b');
    await store.beginRegistration({ now, ceremony: firstCeremony });
    await store.beginRegistration({ now, ceremony: secondCeremony });
    const firstAccount = account('account-registration-a');
    const secondAccount = account('account-registration-b');

    const results = await Promise.all([
      store.completeRegistration({
        now,
        account: firstAccount,
        credential: credential('credential-a', firstAccount.id),
        ceremonyId: firstCeremony.id,
        invitationDigest: invitation,
        session: session('session-a', firstAccount.id),
      }),
      store.completeRegistration({
        now,
        account: secondAccount,
        credential: credential('credential-b', secondAccount.id),
        ceremonyId: secondCeremony.id,
        invitationDigest: invitation,
        session: session('session-b', secondAccount.id),
      }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await scalar('SELECT COUNT(*) AS value FROM accounts')).toBe(1);
    expect(await scalar('SELECT COUNT(*) AS value FROM credentials')).toBe(1);
    expect(await scalar('SELECT COUNT(*) AS value FROM sessions')).toBe(1);
  });

  it('rolls back every earlier statement when a late session insert fails', async () => {
    const inviteDigest = asSecretDigest('rollback-invite');
    await seedInvitation(inviteDigest);
    const pending = {
      ...ceremony('rollback', 'rollback-challenge'),
      invitationDigest: inviteDigest,
    };
    await store.beginRegistration({ now, ceremony: pending });
    const existingAccount = account('existing-account');
    const existingCredential = credential('existing-credential', existingAccount.id);
    await seedAccountAndCredential(existingAccount, existingCredential);
    await db
      .prepare(
        'INSERT INTO sessions (id, token_digest, account_id, created_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL)'
      )
      .bind('duplicate-session', 'existing-token', existingAccount.id, now, 30_000)
      .run();
    const newAccount = account('account-rollback');

    const result = await store.completeRegistration({
      now,
      account: newAccount,
      credential: credential('rollback-credential', newAccount.id),
      ceremonyId: pending.id,
      invitationDigest: inviteDigest,
      session: {
        ...session('rollback-session', newAccount.id),
        id: asSessionId('duplicate-session'),
      },
    });

    expect(result).toEqual({ ok: false, failure: { code: 'internal', retryable: true } });
    expect(await scalar('SELECT COUNT(*) AS value FROM accounts WHERE id = ?', newAccount.id)).toBe(
      0
    );
    expect(
      await scalar('SELECT COUNT(*) AS value FROM credentials WHERE id = ?', 'rollback-credential')
    ).toBe(0);
    expect(
      await scalar(
        'SELECT COUNT(*) AS value FROM invitations WHERE code_digest = ? AND consumed_at IS NULL',
        inviteDigest
      )
    ).toBe(1);
    expect(
      await scalar(
        'SELECT COUNT(*) AS value FROM ceremonies WHERE id = ? AND consumed_at IS NULL',
        pending.id
      )
    ).toBe(1);
  });

  it('consumes one authentication ceremony once and never regresses its counter', async () => {
    const accountRecord = account('authentication-account');
    const key = credential('authentication-credential', accountRecord.id, 4);
    await seedAccountAndCredential(accountRecord, key);
    const authentication: CeremonyRecord = {
      ...ceremony('authentication', 'authentication-challenge'),
      kind: 'authentication',
      accountId: null,
      invitationDigest: null,
    };
    await store.beginAuthentication({ now, ceremony: authentication });
    const command = {
      now,
      ceremonyId: authentication.id,
      credentialId: key.id,
      nextCounter: 5,
      session: session('authentication-session', accountRecord.id),
    };

    const results = await Promise.all([
      store.completeAuthentication(command),
      store.completeAuthentication({
        ...command,
        session: session('authentication-replay', accountRecord.id),
      }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.some((result) => !result.ok && result.failure.code === 'ceremonyReplayed')).toBe(
      true
    );
    expect(await scalar('SELECT counter AS value FROM credentials WHERE id = ?', key.id)).toBe(5);
    expect(
      await scalar('SELECT COUNT(*) AS value FROM sessions WHERE account_id = ?', accountRecord.id)
    ).toBe(1);
  });

  it('serializes concurrent counter advances without committing a regression', async () => {
    const accountRecord = account('counter-account');
    const key = credential('counter-credential', accountRecord.id, 4);
    await seedAccountAndCredential(accountRecord, key);
    const first: CeremonyRecord = {
      ...ceremony('counter-first', 'counter-challenge-first'),
      kind: 'authentication',
      accountId: null,
      invitationDigest: null,
    };
    const second: CeremonyRecord = {
      ...ceremony('counter-second', 'counter-challenge-second'),
      kind: 'authentication',
      accountId: null,
      invitationDigest: null,
    };
    await store.beginAuthentication({ now, ceremony: first });
    await store.beginAuthentication({ now, ceremony: second });

    const results = await Promise.all([
      store.completeAuthentication({
        now,
        ceremonyId: first.id,
        credentialId: key.id,
        nextCounter: 5,
        session: session('counter-session-five', accountRecord.id),
      }),
      store.completeAuthentication({
        now,
        ceremonyId: second.id,
        credentialId: key.id,
        nextCounter: 6,
        session: session('counter-session-six', accountRecord.id),
      }),
    ]);

    expect(results[1].ok).toBe(true);
    expect(await scalar('SELECT counter AS value FROM credentials WHERE id = ?', key.id)).toBe(6);
    expect(
      results.every((result) => result.ok || result.failure.code === 'counterRegression')
    ).toBe(true);
  });

  it('rejects revoking the final active credential atomically', async () => {
    const accountRecord = account('last-credential-account');
    const key = credential('last-credential', accountRecord.id);
    await seedAccountAndCredential(accountRecord, key);

    const result = await store.revokeCredential({
      accountId: accountRecord.id,
      credentialId: key.id,
      now,
    });

    expect(result).toEqual({ ok: false, failure: { code: 'lastCredential', retryable: false } });
    expect(
      await scalar(
        'SELECT COUNT(*) AS value FROM credentials WHERE id = ? AND revoked_at IS NULL',
        key.id
      )
    ).toBe(1);
  });
});
