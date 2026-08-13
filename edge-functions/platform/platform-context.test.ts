import { describe, expect, it } from 'vitest';

import type { D1DatabasePort } from '@sightplay/identity-server';

import { createCloudflareContext } from './cloudflare';

describe('Cloudflare platform context', () => {
  it('adapts the transactional identity database and only exposes string configuration', () => {
    const identityDb = {} as D1DatabasePort;
    const request = new Request('https://example.com/api/auth/session');

    const platform = createCloudflareContext({
      request,
      env: {
        IDENTITY_DB: identityDb,
        GEMINI_API_KEY: 'gemini-key',
        NON_STRING: 123,
      },
      params: {},
    });

    expect(platform.request).toBe(request);
    expect(platform.identityStore).toBeDefined();
    expect(platform.identityRateLimits).toBeDefined();
    expect(platform.env('GEMINI_API_KEY')).toBe('gemini-key');
    expect(platform.env('NON_STRING')).toBeUndefined();
    expect(platform.env('MISSING')).toBeUndefined();
  });
});
