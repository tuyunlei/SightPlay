import { describe, expect, it, vi } from 'vitest';

import { createHttpIdentityApi } from './httpIdentityApi';

describe('HTTP Identity adapter contract', () => {
  it('rejects an invalid session payload before it reaches Identity state', async () => {
    const api = createHttpIdentityApi(
      vi.fn(async () => ({ ok: true, json: async () => ({ authenticated: 'yes' }) }) as Response)
    );

    await expect(api.loadSession(new AbortController().signal)).resolves.toEqual({
      ok: false,
      failure: { code: 'invalidResponse', retryable: true },
    });
  });

  it('normalizes login credentials and drops malformed descriptors', async () => {
    const api = createHttpIdentityApi(
      vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              challenge: 'challenge',
              allowCredentials: [
                { id: 'valid', transports: ['internal', 42] },
                { transports: ['usb'] },
              ],
              userVerification: 'preferred',
            }),
          }) as Response
      )
    );

    const result = await api.requestLoginOptions(new AbortController().signal);

    expect(result).toEqual({
      ok: true,
      value: {
        challenge: 'challenge',
        allowCredentials: [{ id: 'valid', transports: ['internal'] }],
        userVerification: 'preferred',
      },
    });
  });
});
