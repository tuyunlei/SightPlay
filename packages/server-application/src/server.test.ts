import { describe, expect, it } from 'vitest';

import type { PlatformContext } from './platform';
import { handleServerRequest, resolveServerRoute } from './server';

const request = (path: string, method = 'GET') =>
  new Request(`https://sightplay.example${path}`, { method });

const platform = (path: string, method = 'GET'): PlatformContext => ({
  request: request(path, method),
  env: () => undefined,
});

describe('Server application routing', () => {
  it('distinguishes authenticated, bootstrap, and validation invitation capabilities', () => {
    expect(resolveServerRoute(request('/api/auth/invite', 'POST'))?.id).toBe('invite');
    expect(resolveServerRoute(request('/api/auth/bootstrap/invitations', 'POST'))?.id).toBe(
      'identity-bootstrap-invitations'
    );
    expect(resolveServerRoute(request('/api/auth/invite/ABCD-EFGH'))?.id).toBe('invite-code');
  });

  it('matches exact routes instead of accepting a shared prefix', () => {
    expect(resolveServerRoute(request('/api/auth/session-extra'))).toBeNull();
  });

  it('owns OPTIONS and method rejection consistently for every platform', async () => {
    const options = await handleServerRequest(platform('/api/auth/passkeys', 'OPTIONS'));
    expect(options.status).toBe(204);
    expect(options.headers.get('Allow')).toBe('GET, DELETE, OPTIONS');

    const rejected = await handleServerRequest(platform('/api/auth/session', 'POST'));
    expect(rejected.status).toBe(405);
    expect(rejected.headers.get('Allow')).toBe('GET, OPTIONS');
  });
});
