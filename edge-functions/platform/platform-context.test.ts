import { describe, expect, it } from 'vitest';

import { createCloudflareContext } from './cloudflare';
import { createEdgeOneContext } from './edgeone';
import type { KVStore } from './types';

class FakeKV implements KVStore {
  async get(): Promise<string | null> {
    return null;
  }

  async put(): Promise<void> {
    return;
  }

  async delete(): Promise<void> {
    return;
  }
}

describe('platform context adapters', () => {
  it('creates Cloudflare context and resolves only string env values', () => {
    const kv = new FakeKV();
    const request = new Request('https://example.com/api/auth/session');

    const platform = createCloudflareContext({
      request,
      env: {
        AUTH_STORE: kv,
        JWT_SECRET: 'jwt-secret',
        GEMINI_API_KEY: 'gemini-key',
        NON_STRING: 123,
      },
      params: {},
    });

    expect(platform.request).toBe(request);
    expect(platform.kv).toBe(kv);
    expect(platform.env('JWT_SECRET')).toBe('jwt-secret');
    expect(platform.env('NON_STRING')).toBeUndefined();
    expect(platform.env('MISSING')).toBeUndefined();
  });

  it('creates EdgeOne context from provided env store', () => {
    const kv = new FakeKV();
    const request = new Request('https://example.com/api/auth/session');

    const platform = createEdgeOneContext({
      request,
      env: {
        AUTH_STORE: kv,
        JWT_SECRET: 'jwt-secret',
        GEMINI_API_KEY: 'gemini-key',
        NON_STRING: false,
      },
    });

    expect(platform.kv).toBe(kv);
    expect(platform.request).toBe(request);
    expect(platform.env('JWT_SECRET')).toBe('jwt-secret');
    expect(platform.env('NON_STRING')).toBeUndefined();
  });

  it('falls back to global values for EdgeOne context', () => {
    const kv = new FakeKV();
    Object.assign(globalThis as Record<string, unknown>, {
      AUTH_STORE: kv,
      JWT_SECRET: 'global-jwt',
    });

    const platform = createEdgeOneContext({
      request: new Request('https://example.com/api/auth/session'),
    });

    expect(platform.kv).toBe(kv);
    expect(platform.env('JWT_SECRET')).toBe('global-jwt');
  });

  it('throws when EdgeOne AUTH_STORE is unavailable', () => {
    delete (globalThis as Record<string, unknown>).AUTH_STORE;

    expect(() =>
      createEdgeOneContext({
        request: new Request('https://example.com/api/auth/session'),
      })
    ).toThrow('AUTH_STORE KV namespace not available');
  });
});
