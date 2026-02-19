import { describe, expect, it } from 'vitest';

import type { KVStore, PlatformContext } from '../../../platform';
import { handleGetInviteByCode, handlePostInviteAdmin } from '../invite';
import { inviteKey } from '../invite-code';

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

function createContext(options: {
  request: Request;
  kv?: KVStore;
  adminSecret?: string;
}): PlatformContext {
  const { request, kv = new FakeKV(), adminSecret = 'top-secret' } = options;
  return {
    request,
    kv,
    env(key: string) {
      if (key === 'ADMIN_SECRET') return adminSecret;
      return undefined;
    },
  };
}

describe('invite endpoint security', () => {
  it('admin endpoint rejects requests without X-Admin-Secret header', async () => {
    const context = createContext({
      request: new Request('https://example.com/api/auth/invite/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ count: 1 }),
      }),
    });

    const response = await handlePostInviteAdmin(context);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Unauthorized',
      requestId: expect.any(String),
    });
  });

  it('admin endpoint rejects requests with wrong secret', async () => {
    const context = createContext({
      request: new Request('https://example.com/api/auth/invite/admin', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-Admin-Secret': 'wrong-secret',
        },
        body: JSON.stringify({ count: 1 }),
      }),
    });

    const response = await handlePostInviteAdmin(context);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Unauthorized',
      requestId: expect.any(String),
    });
  });

  it('admin endpoint accepts correct secret and returns codes', async () => {
    const context = createContext({
      request: new Request('https://example.com/api/auth/invite/admin', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-Admin-Secret': 'top-secret',
        },
        body: JSON.stringify({ count: 2 }),
      }),
    });

    const response = await handlePostInviteAdmin(context);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { codes: string[] };
    expect(payload.codes).toHaveLength(2);
    for (const code of payload.codes) {
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    }
  });

  it('invite validation returns valid=false for non-existent codes', async () => {
    const context = createContext({
      request: new Request('https://example.com/api/auth/invite/ABCD-EFGH', {
        headers: { 'CF-Connecting-IP': '1.1.1.1' },
      }),
    });

    const response = await handleGetInviteByCode(context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ valid: false, reason: 'invalid' });
  });

  it('invite validation returns valid=false for expired codes', async () => {
    const kv = new FakeKV();
    await kv.put(
      inviteKey('ABCD-EFGH'),
      JSON.stringify({
        createdBy: 'admin',
        createdAt: Date.now() - 60_000,
        expiresAt: Date.now() - 1,
      })
    );

    const context = createContext({
      kv,
      request: new Request('https://example.com/api/auth/invite/ABCD-EFGH', {
        headers: { 'CF-Connecting-IP': '2.2.2.2' },
      }),
    });

    const response = await handleGetInviteByCode(context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ valid: false, reason: 'expired' });
  });

  it('invite validation returns valid=false for already-used codes', async () => {
    const now = Date.now();
    const kv = new FakeKV();
    await kv.put(
      inviteKey('ABCD-EFGH'),
      JSON.stringify({
        createdBy: 'admin',
        createdAt: now - 60_000,
        expiresAt: now + 60_000,
        usedBy: 'credential-1',
        usedAt: now - 10_000,
      })
    );

    const context = createContext({
      kv,
      request: new Request('https://example.com/api/auth/invite/ABCD-EFGH', {
        headers: { 'CF-Connecting-IP': '3.3.3.3' },
      }),
    });

    const response = await handleGetInviteByCode(context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ valid: false, reason: 'used' });
  });

  it('rate limiting returns 429 after threshold exceeded', async () => {
    const kv = new FakeKV();
    const url = 'https://example.com/api/auth/invite/ABCD-EFGH';
    const headers = { 'CF-Connecting-IP': '9.9.9.9' };

    for (let i = 0; i < 10; i += 1) {
      const response = await handleGetInviteByCode(
        createContext({ kv, request: new Request(url, { headers }) })
      );
      expect(response.status).toBe(200);
    }

    const blocked = await handleGetInviteByCode(
      createContext({ kv, request: new Request(url, { headers }) })
    );
    expect(blocked.status).toBe(429);
    await expect(blocked.json()).resolves.toMatchObject({
      error: 'Too many requests',
      requestId: expect.any(String),
    });
  });
});
