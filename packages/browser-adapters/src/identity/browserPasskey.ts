import { client } from '@passwordless-id/webauthn';
import type {
  IdentityFailure,
  LoginOptions,
  PasskeyPort,
  PortResult,
  RegistrationOptions,
  SerializedPasskey,
} from '@sightplay/identity-client';

function classifyPasskeyFailure(error: unknown): IdentityFailure {
  if (error instanceof Error && error.name === 'NotAllowedError') {
    return { code: 'userCanceled', retryable: true };
  }
  if (error instanceof Error && error.name === 'NotSupportedError') {
    return { code: 'authenticatorUnavailable', retryable: false };
  }
  if (error instanceof Error && (error.name === 'NetworkError' || error.name === 'AbortError')) {
    return { code: 'connectionUnavailable', retryable: true };
  }
  return { code: 'unknown', retryable: true };
}

function serializeCredential(value: unknown): PortResult<SerializedPasskey> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, failure: { code: 'invalidResponse', retryable: true } };
  }
  return { ok: true, value: { value: value as Record<string, unknown> } };
}

async function authenticate(options: LoginOptions): Promise<PortResult<SerializedPasskey>> {
  try {
    const value = await client.authenticate({
      challenge: options.challenge,
      allowCredentials: options.allowCredentials.map((credential) => ({
        id: credential.id,
        transports: [...credential.transports],
      })),
      userVerification: options.userVerification,
      timeout: options.timeout,
    });
    return serializeCredential(value);
  } catch (error) {
    return { ok: false, failure: classifyPasskeyFailure(error) };
  }
}

async function register(options: RegistrationOptions): Promise<PortResult<SerializedPasskey>> {
  try {
    const value = await client.register({
      challenge: options.challenge,
      user: options.user,
      discoverable: options.authenticatorSelection?.residentKey,
      userVerification: options.authenticatorSelection?.userVerification,
      customProperties: {
        rp: options.rp,
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout,
      },
    });
    return serializeCredential(value);
  } catch (error) {
    return { ok: false, failure: classifyPasskeyFailure(error) };
  }
}

export function createBrowserPasskeyPort(): PasskeyPort {
  return {
    isSupported: () =>
      typeof window.PublicKeyCredential === 'function' && window.isSecureContext !== false,
    authenticate,
    register,
  };
}

export const passkeyFailureContract = { classifyPasskeyFailure, serializeCredential };
