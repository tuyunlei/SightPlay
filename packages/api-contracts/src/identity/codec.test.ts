import { describe, expect, it } from 'vitest';

import {
  decodeLoginOptions,
  decodeRegistrationVerificationRequest,
  decodeSessionSnapshot,
} from './codec';

describe('Identity API boundary codecs', () => {
  it('rejects a session response that would turn truthy strings into authentication', () => {
    expect(decodeSessionSnapshot({ authenticated: 'false', hasPasskeys: true }).ok).toBe(false);
  });

  it('rejects one malformed credential instead of silently shrinking the login allow-list', () => {
    const decoded = decodeLoginOptions({
      challenge: 'challenge',
      allowCredentials: [{ id: 'credential-a' }, { transports: ['internal'] }],
    });

    expect(decoded.ok).toBe(false);
  });

  it('accepts an opaque WebAuthn registration response without interpreting provider fields', () => {
    const decoded = decodeRegistrationVerificationRequest({
      inviteCode: 'ABCD-EFGH',
      name: 'Laptop',
      response: { id: 'credential-a', response: { clientDataJSON: 'opaque' } },
    });

    expect(decoded).toEqual({
      ok: true,
      value: {
        inviteCode: 'ABCD-EFGH',
        name: 'Laptop',
        response: { id: 'credential-a', response: { clientDataJSON: 'opaque' } },
      },
    });
  });
});
