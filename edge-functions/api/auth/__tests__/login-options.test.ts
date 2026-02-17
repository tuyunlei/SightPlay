import { describe, expect, it, vi } from 'vitest';

import type { KVStore, PlatformContext } from '../../../platform';
import { handlePostLoginOptions } from '../login-options';

vi.mock('@passwordless-id/webauthn', () => ({
  server: {
    randomChallenge: vi.fn(() => 'mock-challenge'),
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

function createContext(kv: KVStore): PlatformContext {
  return {
    request: new Request('https://sightplay.xclz.org/api/auth/login-options', {
      method: 'POST',
      headers: {
        Origin: 'https://sightplay.xclz.org',
      },
    }),
    kv,
    env: () => undefined,
  };
}

describe('login-options endpoint', () => {
  it('returns 400 when no passkeys registered', async () => {
    const kv = new FakeKV();
    const response = await handlePostLoginOptions(createContext(kv));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'No passkeys registered' });
  });

  it('returns login options and stores challenge', async () => {
    const kv = new FakeKV();
    await kv.put(
      'passkeys',
      JSON.stringify([
        { id: 'pk-1', publicKey: 'a', counter: 1, name: 'MacBook', createdAt: Date.now() },
        { id: 'pk-2', publicKey: 'b', counter: 2, name: 'iPhone', createdAt: Date.now() },
      ])
    );

    const response = await handlePostLoginOptions(createContext(kv));
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      challenge: string;
      rpId: string;
      allowCredentials: Array<{ id: string; transports: string[] }>;
      hints: string[];
    };

    expect(payload.challenge).toBe('mock-challenge');
    expect(payload.rpId).toBe('sightplay.xclz.org');
    expect(payload.hints).toEqual(['client-device']);
    expect(payload.allowCredentials).toEqual([
      { id: 'pk-1', type: 'public-key', transports: ['internal'] },
      { id: 'pk-2', type: 'public-key', transports: ['internal'] },
    ]);
    await expect(kv.get('challenge:mock-challenge')).resolves.toBe('mock-challenge');
  });

  it('returns 500 when KV data is malformed', async () => {
    const kv = new FakeKV();
    await kv.put('passkeys', '{bad json');

    const response = await handlePostLoginOptions(createContext(kv));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' });
  });
});
