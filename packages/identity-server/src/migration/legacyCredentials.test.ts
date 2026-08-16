import { describe, expect, it } from 'vitest';

import { decodeLegacyCredentialExport } from './legacyCredentials';

const credential = {
  id: 'credential-1',
  publicKey: 'spki-public-key',
  counter: 4,
  name: 'Existing Passkey',
  createdAt: 1000,
  transports: ['internal'],
  algorithm: 'ES256',
};

describe('legacy credential export decoder', () => {
  it('maps the old global array into one explicit account with SPKI credentials', () => {
    const result = decodeLegacyCredentialExport([credential]);

    expect(result).toMatchObject({
      ok: true,
      value: {
        account: { id: 'legacy-owner', createdAt: 1000 },
        credentials: [{ id: 'credential-1', accountId: 'legacy-owner', publicKeyFormat: 'spki' }],
      },
    });
  });

  it('rejects the complete export when any credential is malformed', () => {
    expect(
      decodeLegacyCredentialExport([credential, { ...credential, createdAt: 'unknown' }])
    ).toEqual({ ok: false, failure: { code: 'invalidRequest', retryable: false } });
  });

  it('rejects duplicate credential identifiers before any database write', () => {
    expect(decodeLegacyCredentialExport([credential, credential])).toEqual({
      ok: false,
      failure: { code: 'credentialConflict', retryable: false },
    });
  });
});
