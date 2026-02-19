import { describe, expect, it, vi } from 'vitest';

import type { KVStore, PlatformContext } from '../../../platform';
import { inviteKey } from '../invite-code';
import { handlePostRegisterOptions } from '../register-options';

vi.mock('@passwordless-id/webauthn', () => ({
  server: {
    randomChallenge: vi.fn(() => 'register-challenge'),
  },
}));

class FakeKV implements KVStore {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

function createContext(body: unknown, kv: KVStore, ip = '1.1.1.1'): PlatformContext {
  return {
    request: new Request('https://sightplay.xclz.org/api/auth/register-options', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://sightplay.xclz.org',
        'CF-Connecting-IP': ip,
      },
      body: JSON.stringify(body),
    }),
    kv,
    env: () => undefined,
  };
}

describe('register-options endpoint', () => {
  it('rejects invalid invite code format', async () => {
    const response = await handlePostRegisterOptions(
      createContext({ inviteCode: 'bad' }, new FakeKV())
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invite code is invalid',
      requestId: expect.any(String),
    });
  });

  it('rejects used or expired invite codes', async () => {
    const now = Date.now();

    const usedKv = new FakeKV();
    await usedKv.put(
      inviteKey('ABCD-EFGH'),
      JSON.stringify({
        createdBy: 'admin',
        createdAt: now,
        expiresAt: now + 60_000,
        usedBy: 'pk-1',
      })
    );
    const used = await handlePostRegisterOptions(
      createContext({ inviteCode: 'ABCD-EFGH' }, usedKv, '2.2.2.2')
    );
    expect(used.status).toBe(401);

    const expiredKv = new FakeKV();
    await expiredKv.put(
      inviteKey('ABCD-EFGH'),
      JSON.stringify({ createdBy: 'admin', createdAt: now - 120_000, expiresAt: now - 1 })
    );
    const expired = await handlePostRegisterOptions(
      createContext({ inviteCode: 'ABCD-EFGH' }, expiredKv, '3.3.3.3')
    );
    expect(expired.status).toBe(401);
  });

  it('returns WebAuthn register options and stores challenge for valid invite', async () => {
    const now = Date.now();
    const kv = new FakeKV();
    await kv.put(
      inviteKey('ABCD-EFGH'),
      JSON.stringify({ createdBy: 'admin', createdAt: now, expiresAt: now + 60_000 })
    );
    await kv.put(
      'passkeys',
      JSON.stringify([
        {
          id: 'pk-1',
          publicKey: 'x',
          counter: 1,
          name: 'Mac',
          createdAt: now,
          transports: ['internal'],
        },
      ])
    );

    const response = await handlePostRegisterOptions(
      createContext({ inviteCode: 'ABCD-EFGH' }, kv)
    );
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      challenge: string;
      rp: { id: string; name: string };
      excludeCredentials: Array<{ id: string }>;
      user: { id: string; name: string };
    };

    expect(payload.challenge).toBe('register-challenge');
    expect(payload.rp).toEqual({ id: 'sightplay.xclz.org', name: 'SightPlay' });
    expect(payload.excludeCredentials).toHaveLength(1);
    expect(payload.excludeCredentials[0].id).toBe('pk-1');
    expect(payload.user.name).toBe('SightPlay User');
    await expect(kv.get('challenge:register-challenge')).resolves.toBe('register-challenge');
  });
});
