import { describe, expect, it } from 'vitest';

import { passkeyAdapterContract } from './browserPasskey';

describe('browser Passkey failure contract', () => {
  it.each([
    ['NotAllowedError', 'userCanceled', true],
    ['NotSupportedError', 'authenticatorUnavailable', false],
    ['NetworkError', 'connectionUnavailable', true],
  ])('maps %s to a structured failure', (name, code, retryable) => {
    const error = new Error('provider-owned text');
    error.name = name;

    expect(passkeyAdapterContract.classifyPasskeyFailure(error)).toEqual({ code, retryable });
  });

  it('canonicalizes a provider registration before it crosses the Identity port', () => {
    const result = passkeyAdapterContract.serializeRegistrationCredential({
      id: 'credential_AQI',
      rawId: 'credential_AQI==',
      type: 'public-key',
      response: {
        clientDataJSON: 'client_data==',
        attestationObject: 'attestation_data=',
        transports: ['internal'],
        publicKey: 'provider-only-field==',
      },
    });

    expect(result).toEqual({
      ok: true,
      value: {
        value: {
          id: 'credential_AQI',
          rawId: 'credential_AQI',
          type: 'public-key',
          response: {
            clientDataJSON: 'client_data',
            attestationObject: 'attestation_data',
            transports: ['internal'],
          },
        },
      },
    });
  });

  it('rejects a credential whose ID and raw ID encode different bytes', () => {
    const result = passkeyAdapterContract.serializeAuthenticationCredential({
      id: 'credential_AQI',
      rawId: 'different_AQI==',
      type: 'public-key',
      response: {
        clientDataJSON: 'client_data==',
        authenticatorData: 'authenticator_data=',
        signature: 'signature_data=',
      },
    });

    expect(result).toEqual({
      ok: false,
      failure: { code: 'invalidResponse', retryable: true },
    });
  });
});
