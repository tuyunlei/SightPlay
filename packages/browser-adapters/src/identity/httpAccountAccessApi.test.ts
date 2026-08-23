import { describe, expect, it, vi } from 'vitest';

import { createHttpAccountAccessApi } from './httpAccountAccessApi';

const response = (ok: boolean, data: unknown): Response =>
  ({
    ok,
    json: async () =>
      ok
        ? { ok: true, data, requestId: 'request-1' }
        : {
            ok: false,
            error: { code: 'credentialConflict', retryable: false },
            requestId: 'request-1',
          },
  }) as Response;

describe('HTTP Account Access contract', () => {
  it('rejects the entire credential list when one nested item is malformed', async () => {
    const api = createHttpAccountAccessApi(
      vi.fn(async () =>
        response(true, [
          { id: 'valid', name: 'Phone', createdAt: 1 },
          { id: 'invalid', name: 'Laptop', createdAt: 'yesterday' },
        ])
      )
    );

    expect(await api.loadAccountAccess(new AbortController().signal)).toEqual({
      ok: false,
      failure: { code: 'invalidResponse', retryable: true },
    });
  });

  it('maps a structured server rejection without consulting response text', async () => {
    const api = createHttpAccountAccessApi(vi.fn(async () => response(false, null)));

    expect(await api.revokeCredential('key', new AbortController().signal)).toEqual({
      ok: false,
      failure: { code: 'credentialRevocationRejected', retryable: false },
    });
  });
});
