import { client } from '@passwordless-id/webauthn';
import type {
  IdentityFailure,
  LoginOptions,
  PasskeyPort,
  PortResult,
  RegistrationOptions,
  SerializedPasskey,
} from '@sightplay/identity-client';

export interface BrowserWebAuthnProvider {
  authenticate(options: Parameters<typeof client.authenticate>[0]): Promise<unknown>;
  register(options: Parameters<typeof client.register>[0]): Promise<unknown>;
}

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

const invalidResponse = (): PortResult<SerializedPasskey> => ({
  ok: false,
  failure: { code: 'invalidResponse', retryable: true },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function canonicalBase64Url(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+={0,2}$/.test(value)) return null;
  const canonical = value.replace(/=+$/, '');
  return canonical.length % 4 === 1 ? null : canonical;
}

function readCredentialEnvelope(value: unknown) {
  if (!isRecord(value) || value.type !== 'public-key' || !isRecord(value.response)) return null;
  const id = canonicalBase64Url(value.id);
  const rawId = canonicalBase64Url(value.rawId);
  if (!id || id !== value.id || rawId !== id) return null;
  return { id, response: value.response };
}

function serializeRegistrationCredential(value: unknown): PortResult<SerializedPasskey> {
  const envelope = readCredentialEnvelope(value);
  if (!envelope) return invalidResponse();
  const clientDataJSON = canonicalBase64Url(envelope.response.clientDataJSON);
  const attestationObject = canonicalBase64Url(envelope.response.attestationObject);
  const transports = envelope.response.transports;
  if (
    !clientDataJSON ||
    !attestationObject ||
    !Array.isArray(transports) ||
    !transports.every((transport) => typeof transport === 'string')
  ) {
    return invalidResponse();
  }
  return {
    ok: true,
    value: {
      value: {
        id: envelope.id,
        rawId: envelope.id,
        type: 'public-key',
        response: { clientDataJSON, attestationObject, transports },
      },
    },
  };
}

function serializeAuthenticationCredential(value: unknown): PortResult<SerializedPasskey> {
  const envelope = readCredentialEnvelope(value);
  if (!envelope) return invalidResponse();
  const clientDataJSON = canonicalBase64Url(envelope.response.clientDataJSON);
  const authenticatorData = canonicalBase64Url(envelope.response.authenticatorData);
  const signature = canonicalBase64Url(envelope.response.signature);
  const rawUserHandle = envelope.response.userHandle;
  const userHandle = rawUserHandle == null ? null : canonicalBase64Url(rawUserHandle);
  if (
    !clientDataJSON ||
    !authenticatorData ||
    !signature ||
    (rawUserHandle != null && !userHandle)
  ) {
    return invalidResponse();
  }
  return {
    ok: true,
    value: {
      value: {
        id: envelope.id,
        rawId: envelope.id,
        type: 'public-key',
        response: {
          clientDataJSON,
          authenticatorData,
          signature,
          ...(userHandle ? { userHandle } : {}),
        },
      },
    },
  };
}

async function authenticate(
  provider: BrowserWebAuthnProvider,
  options: LoginOptions
): Promise<PortResult<SerializedPasskey>> {
  try {
    const value = await provider.authenticate({
      challenge: options.challenge,
      allowCredentials: options.allowCredentials.map((credential) => ({
        id: credential.id,
        transports: [...credential.transports],
      })),
      userVerification: options.userVerification,
      timeout: options.timeout,
    });
    return serializeAuthenticationCredential(value);
  } catch (error) {
    return { ok: false, failure: classifyPasskeyFailure(error) };
  }
}

async function register(
  provider: BrowserWebAuthnProvider,
  options: RegistrationOptions
): Promise<PortResult<SerializedPasskey>> {
  try {
    const value = await provider.register({
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
    return serializeRegistrationCredential(value);
  } catch (error) {
    return { ok: false, failure: classifyPasskeyFailure(error) };
  }
}

export function createBrowserPasskeyPort(provider: BrowserWebAuthnProvider = client): PasskeyPort {
  return {
    isSupported: () =>
      typeof window.PublicKeyCredential === 'function' && window.isSecureContext !== false,
    authenticate: (options) => authenticate(provider, options),
    register: (options) => register(provider, options),
  };
}

export const passkeyAdapterContract = {
  classifyPasskeyFailure,
  serializeAuthenticationCredential,
  serializeRegistrationCredential,
};
