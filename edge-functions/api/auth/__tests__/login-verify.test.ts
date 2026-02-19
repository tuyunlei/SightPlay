import { describe, expect, it, vi } from 'vitest';

import type { KVStore, PlatformContext } from '../../../platform';
import { handlePostLoginVerify } from '../login-verify';

vi.mock('@passwordless-id/webauthn', () => ({
  server: {
    verifyAuthentication: vi.fn(async () => ({ counter: 42 })),
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

function encodeClientData(challenge: string): string {
  const json = JSON.stringify({ challenge });
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function createContext(response: unknown, kv: KVStore): PlatformContext {
  return {
    request: new Request('https://sightplay.xclz.org/api/auth/login-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://sightplay.xclz.org',
      },
      body: JSON.stringify({ response }),
    }),
    kv,
    env: (key: string) => (key === 'JWT_SECRET' ? 'jwt-secret' : undefined),
  };
}

describe('login-verify endpoint', () => {
  it('rejects missing challenge in KV', async () => {
    const kv = new FakeKV();
    const response = await handlePostLoginVerify(
      createContext(
        {
          id: 'pk-1',
          response: { clientDataJSON: encodeClientData('challenge-a') },
        },
        kv
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid or expired challenge' });
  });

  it('rejects unknown credential id', async () => {
    const kv = new FakeKV();
    await kv.put('challenge:challenge-a', 'challenge-a');
    await kv.put(
      'passkeys',
      JSON.stringify([{ id: 'pk-1', publicKey: 'k', counter: 0, name: 'm', createdAt: 1 }])
    );

    const response = await handlePostLoginVerify(
      createContext(
        {
          id: 'pk-2',
          response: { clientDataJSON: encodeClientData('challenge-a') },
        },
        kv
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Credential not found' });
  });

  it('verifies authentication, updates counter, deletes challenge and sets cookie', async () => {
    const kv = new FakeKV();
    await kv.put('challenge:challenge-a', 'challenge-a');
    await kv.put(
      'passkeys',
      JSON.stringify([
        {
          id: 'pk-1',
          publicKey: 'public-key',
          algorithm: 'ES256',
          counter: 1,
          name: 'MacBook',
          createdAt: Date.now(),
          transports: ['internal'],
        },
      ])
    );

    const response = await handlePostLoginVerify(
      createContext(
        {
          id: 'pk-1',
          rawId: 'pk-1',
          response: {
            clientDataJSON: encodeClientData('challenge-a'),
            authenticatorData: 'auth-data',
            signature: 'sig',
          },
        },
        kv
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ verified: true });
    expect(response.headers.get('Set-Cookie')).toContain('auth_token=');

    const saved = await kv.get('passkeys');
    expect(saved).toContain('"counter":42');
    await expect(kv.get('challenge:challenge-a')).resolves.toBeNull();
  });
});
