import { createInvitationCode } from '../../model/invitation';
import {
  asAccountId,
  asCeremonyId,
  asSecretDigest,
  asSessionId,
  asInvitationAccessId,
  asTimestamp,
} from '../../model/types';
import type { ClockPort, IdentityIdsPort, IdentitySecretsPort } from '../../ports';

export interface SystemIdentityPorts {
  readonly clock: ClockPort;
  readonly ids: IdentityIdsPort;
  readonly secrets: IdentitySecretsPort;
}

class SystemSecrets implements IdentitySecretsPort {
  async digest(value: string) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return asSecretDigest(toBase64Url(new Uint8Array(digest)));
  }

  createChallenge() {
    return randomSecret(32);
  }

  createInvitationCode() {
    return createInvitationCode(crypto.getRandomValues(new Uint8Array(8)));
  }

  createInvitationAccessToken() {
    return `sp_inv_${randomSecret(32)}`;
  }

  createSessionToken() {
    return randomSecret(32);
  }
}

class SystemIds implements IdentityIdsPort {
  createAccountId() {
    return asAccountId(crypto.randomUUID());
  }

  createCeremonyId() {
    return asCeremonyId(crypto.randomUUID());
  }

  createSessionId() {
    return asSessionId(crypto.randomUUID());
  }

  createInvitationAccessId() {
    return asInvitationAccessId(crypto.randomUUID());
  }
}

function randomSecret(length: number): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(length)));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function createSystemIdentityPorts(): SystemIdentityPorts {
  return {
    clock: { now: () => asTimestamp(Date.now()) },
    ids: new SystemIds(),
    secrets: new SystemSecrets(),
  };
}
