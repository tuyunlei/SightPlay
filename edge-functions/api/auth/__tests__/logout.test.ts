import { describe, expect, it } from 'vitest';

import type { PlatformContext } from '../../../platform';
import { handlePostLogout } from '../logout';

const contextFor = (url: string): PlatformContext => ({
  request: new Request(url, { method: 'POST' }),
  kv: {
    get: async () => null,
    put: async () => undefined,
    delete: async () => undefined,
  },
  env: () => undefined,
});

describe('logout endpoint', () => {
  it('expires the HttpOnly cookie and matches Secure to the request protocol', () => {
    const httpsCookie = handlePostLogout(
      contextFor('https://sightplay.xclz.org/api/auth/logout')
    ).headers.get('Set-Cookie');
    const httpCookie = handlePostLogout(
      contextFor('http://127.0.0.1:4173/api/auth/logout')
    ).headers.get('Set-Cookie');

    expect(httpsCookie).toContain('Max-Age=-1');
    expect(httpsCookie).toContain('HttpOnly');
    expect(httpsCookie).toContain('Secure');
    expect(httpCookie).not.toContain('Secure');
  });
});
