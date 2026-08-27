import { describe, expect, it } from 'vitest';

import { createSystemIdentityPorts } from './systemIdentityPorts';

describe('system Identity ports', () => {
  it('creates non-repeating opaque values and stable digests without exposing raw input', async () => {
    const ports = createSystemIdentityPorts();
    const first = ports.secrets.createSessionToken();
    const second = ports.secrets.createSessionToken();
    const digest = await ports.secrets.digest(first);
    const invitationAccess = ports.secrets.createInvitationAccessToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(digest).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(digest).not.toContain(first);
    expect(invitationAccess).toMatch(/^sp_inv_[A-Za-z0-9_-]{43}$/);
  });
});
