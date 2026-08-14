import { describe, expect, it, vi } from 'vitest';

import { createBrowserPasskeyPort, passkeyAdapterContract } from './browserPasskey';

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

  it('passes the server-owned RP ID to the WebAuthn authentication provider', async () => {
    const cancellation = new Error('cancelled');
    cancellation.name = 'NotAllowedError';
    const provider = {
      authenticate: vi.fn().mockRejectedValue(cancellation),
      register: vi.fn(),
    };

    await createBrowserPasskeyPort(provider).authenticate({
      challenge: 'challenge',
      rpId: 'sightplay.pages.dev',
      allowCredentials: [],
    });

    expect(provider.authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'sightplay.pages.dev' })
    );
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
