import { server as legacyServer } from '@passwordless-id/webauthn';
import type {
  AuthenticationJSON as LegacyAuthenticationJSON,
  CredentialInfo,
} from '@passwordless-id/webauthn/dist/esm/types';
import {
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import {
  cose,
  decodeClientDataJSON,
  decodeCredentialPublicKey,
  isoBase64URL,
} from '@simplewebauthn/server/helpers';

import { accepted, failed, type IdentityServerResult } from '../../model/failure';
import { asCredentialId, type CredentialAlgorithm } from '../../model/types';
import type {
  AuthenticationEnvelope,
  RegistrationVerification,
  WebAuthnServerPort,
} from '../../ports';

export class HybridWebAuthnServer implements WebAuthnServerPort {
  encodeUserHandle(accountId: Parameters<WebAuthnServerPort['encodeUserHandle']>[0]) {
    return isoBase64URL.fromUTF8String(accountId);
  }

  readRegistrationChallenge(response: Readonly<Record<string, unknown>>) {
    const parsed = parseRegistrationResponse(response);
    return parsed.ok ? readChallenge(parsed.value.response.clientDataJSON) : parsed;
  }

  readAuthenticationEnvelope(response: Readonly<Record<string, unknown>>) {
    const parsed = parseAuthenticationResponse(response);
    if (!parsed.ok) return parsed;
    const challenge = readChallenge(parsed.value.response.clientDataJSON);
    return challenge.ok
      ? accepted<AuthenticationEnvelope>({
          challenge: challenge.value,
          credentialId: asCredentialId(parsed.value.id),
        })
      : challenge;
  }

  async verifyRegistration(input: Parameters<WebAuthnServerPort['verifyRegistration']>[0]) {
    const parsed = parseRegistrationResponse(input.response);
    if (!parsed.ok) return parsed;
    try {
      const verification = await verifyRegistrationResponse({
        response: parsed.value,
        expectedChallenge: input.challenge,
        expectedOrigin: input.origin,
        expectedRPID: input.rpId,
        requireUserVerification: input.userVerification === 'required',
        supportedAlgorithmIDs: [cose.COSEALG.ES256, cose.COSEALG.RS256, cose.COSEALG.EdDSA],
      });
      if (!verification.verified) return failed('verificationRejected');
      const { credential } = verification.registrationInfo;
      const algorithm = readAlgorithm(credential.publicKey);
      if (!algorithm.ok) return algorithm;
      return accepted<RegistrationVerification>({
        credentialId: asCredentialId(credential.id),
        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
        publicKeyFormat: 'cose',
        algorithm: algorithm.value,
        counter: credential.counter,
        transports: filterTransports(credential.transports ?? []),
        authenticatorName: 'Passkey',
      });
    } catch {
      return failed('verificationRejected');
    }
  }

  async verifyAuthentication(input: Parameters<WebAuthnServerPort['verifyAuthentication']>[0]) {
    const parsed = parseAuthenticationResponse(input.response);
    if (!parsed.ok) return parsed;
    return input.credential.publicKeyFormat === 'cose'
      ? verifyCoseAuthentication(parsed.value, input)
      : verifyLegacyAuthentication(parsed.value, input);
  }
}

async function verifyCoseAuthentication(
  response: AuthenticationResponseJSON,
  input: Parameters<WebAuthnServerPort['verifyAuthentication']>[0]
) {
  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: input.challenge,
      expectedOrigin: input.origin,
      expectedRPID: input.rpId,
      requireUserVerification: input.userVerification === 'required',
      credential: {
        id: input.credential.id,
        publicKey: isoBase64URL.toBuffer(input.credential.publicKey),
        counter: input.credential.counter,
        transports: [...input.credential.transports],
      },
    });
    return verification.verified
      ? accepted({ counter: verification.authenticationInfo.newCounter })
      : failed('verificationRejected');
  } catch {
    return failed('verificationRejected');
  }
}

async function verifyLegacyAuthentication(
  response: AuthenticationResponseJSON,
  input: Parameters<WebAuthnServerPort['verifyAuthentication']>[0]
) {
  try {
    const credential: CredentialInfo = {
      id: input.credential.id,
      publicKey: input.credential.publicKey,
      algorithm: input.credential.algorithm,
      transports: [...input.credential.transports],
    };
    const verification = await legacyServer.verifyAuthentication(
      response as LegacyAuthenticationJSON,
      credential,
      {
        challenge: input.challenge,
        origin: input.origin,
        domain: input.rpId,
        userVerified: input.userVerification === 'required',
        counter: input.credential.counter,
      }
    );
    return accepted({ counter: verification.counter });
  } catch {
    return failed('verificationRejected');
  }
}

function readChallenge(encoded: string): IdentityServerResult<string> {
  try {
    const decoded = decodeClientDataJSON(encoded);
    return typeof decoded.challenge === 'string' && decoded.challenge.length > 0
      ? accepted(decoded.challenge)
      : failed('invalidRequest');
  } catch {
    return failed('invalidRequest');
  }
}

function readAlgorithm(publicKey: Uint8Array): IdentityServerResult<CredentialAlgorithm> {
  try {
    const algorithm = decodeCredentialPublicKey(publicKey).get(cose.COSEKEYS.alg);
    if (algorithm === cose.COSEALG.ES256) return accepted('ES256');
    if (algorithm === cose.COSEALG.RS256) return accepted('RS256');
    if (algorithm === cose.COSEALG.EdDSA) return accepted('EdDSA');
    return failed('verificationRejected');
  } catch {
    return failed('verificationRejected');
  }
}

function parseRegistrationResponse(
  value: Readonly<Record<string, unknown>>
): IdentityServerResult<RegistrationResponseJSON> {
  if (!hasCredentialEnvelope(value) || !isRegistrationPayload(value.response)) {
    return failed('invalidRequest');
  }
  return accepted(value as unknown as RegistrationResponseJSON);
}

function parseAuthenticationResponse(
  value: Readonly<Record<string, unknown>>
): IdentityServerResult<AuthenticationResponseJSON> {
  if (!hasCredentialEnvelope(value) || !isAuthenticationPayload(value.response)) {
    return failed('invalidRequest');
  }
  return accepted(value as unknown as AuthenticationResponseJSON);
}

function hasCredentialEnvelope(value: Readonly<Record<string, unknown>>): boolean {
  return (
    typeof value.id === 'string' &&
    typeof value.rawId === 'string' &&
    value.type === 'public-key' &&
    isRecord(value.response)
  );
}

function isRegistrationPayload(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.clientDataJSON === 'string' &&
    typeof value.attestationObject === 'string'
  );
}

function isAuthenticationPayload(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.clientDataJSON === 'string' &&
    typeof value.authenticatorData === 'string' &&
    typeof value.signature === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const supportedTransports = new Set(['ble', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb']);

function filterTransports(values: readonly string[]) {
  return values.filter((value): value is RegistrationVerification['transports'][number] =>
    supportedTransports.has(value)
  );
}

export function createHybridWebAuthnServer(): WebAuthnServerPort {
  return new HybridWebAuthnServer();
}
