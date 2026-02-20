import { afterEach, describe, expect, it, vi } from 'vitest';

import type { KVStore, PlatformContext } from '../../../platform';
import { getAuthenticatedUser } from '../../_auth-helpers';
import { handleDeletePasskey, handleGetPasskeys } from '../passkeys';
import { handleGetSession } from '../session';

vi.mock('../../_auth-helpers', async () => {
  const actual = await vi.importActual<typeof import('../../_auth-helpers')>('../../_auth-helpers');
  return {
    ...actual,
    getAuthenticatedUser: vi.fn(),
  };
});

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

function createContext(request: Request, kv: KVStore, jwtSecret = 'jwt-secret'): PlatformContext {
  return {
    request,
    kv,
    env: (key: string) => (key === 'JWT_SECRET' ? jwtSecret : undefined),
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('session + passkeys auth endpoints', () => {
  it('returns session state for authenticated user with passkeys', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue('owner');
    const kv = new FakeKV();
    await kv.put(
      'passkeys',
      JSON.stringify([{ id: 'pk-1', publicKey: 'p', counter: 0, name: 'n', createdAt: 1 }])
    );

    const response = await handleGetSession(
      createContext(new Request('https://example.com/api/auth/session'), kv)
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: true, hasPasskeys: true });
  });

  it('returns unauthenticated session when auth helper returns null', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    const response = await handleGetSession(
      createContext(new Request('https://example.com/api/auth/session'), new FakeKV())
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: false, hasPasskeys: false });
  });

  it('lists safe passkeys only for authenticated user', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue('owner');
    const kv = new FakeKV();
    await kv.put(
      'passkeys',
      JSON.stringify([
        { id: 'pk-1', publicKey: 'secret', counter: 11, name: 'Mac', createdAt: 100 },
        { id: 'pk-2', publicKey: 'secret2', counter: 12, name: 'Phone', createdAt: 200 },
      ])
    );

    const response = await handleGetPasskeys(
      createContext(new Request('https://example.com/api/auth/passkeys'), kv)
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: 'pk-1', name: 'Mac', createdAt: 100 },
      { id: 'pk-2', name: 'Phone', createdAt: 200 },
    ]);
  });

  it('rejects passkey listing when unauthenticated', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    const response = await handleGetPasskeys(
      createContext(new Request('https://example.com/api/auth/passkeys'), new FakeKV())
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Authentication required',
      requestId: expect.any(String),
    });
  });

  it('deletes a matching passkey', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue('owner');
    const kv = new FakeKV();
    await kv.put(
      'passkeys',
      JSON.stringify([
        { id: 'pk-1', publicKey: 'a', counter: 1, name: 'A', createdAt: 1 },
        { id: 'pk-2', publicKey: 'b', counter: 1, name: 'B', createdAt: 1 },
      ])
    );

    const response = await handleDeletePasskey(
      createContext(
        new Request('https://example.com/api/auth/passkeys?id=pk-2', { method: 'DELETE' }),
        kv
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    await expect(kv.get('passkeys')).resolves.toContain('pk-1');
    await expect(kv.get('passkeys')).resolves.not.toContain('pk-2');
  });

  it('rejects deleting with missing id, last passkey, or unknown id', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue('owner');

    const noId = await handleDeletePasskey(
      createContext(
        new Request('https://example.com/api/auth/passkeys', { method: 'DELETE' }),
        new FakeKV()
      )
    );
    expect(noId.status).toBe(400);

    const oneOnlyKv = new FakeKV();
    await oneOnlyKv.put(
      'passkeys',
      JSON.stringify([{ id: 'pk-1', publicKey: 'a', counter: 1, name: 'A', createdAt: 1 }])
    );
    const lastOne = await handleDeletePasskey(
      createContext(
        new Request('https://example.com/api/auth/passkeys?id=pk-1', { method: 'DELETE' }),
        oneOnlyKv
      )
    );
    expect(lastOne.status).toBe(400);

    const unknownKv = new FakeKV();
    await unknownKv.put(
      'passkeys',
      JSON.stringify([
        { id: 'pk-1', publicKey: 'a', counter: 1, name: 'A', createdAt: 1 },
        { id: 'pk-2', publicKey: 'b', counter: 1, name: 'B', createdAt: 1 },
      ])
    );
    const unknown = await handleDeletePasskey(
      createContext(
        new Request('https://example.com/api/auth/passkeys?id=pk-x', { method: 'DELETE' }),
        unknownKv
      )
    );
    expect(unknown.status).toBe(404);
  });
});
