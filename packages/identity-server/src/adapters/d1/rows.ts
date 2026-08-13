import { failed, type IdentityServerResult } from '../../model/failure';
import {
  asAccountId,
  asCeremonyId,
  asCredentialId,
  asSecretDigest,
  asSessionId,
  asTimestamp,
  type CeremonyRecord,
  type CredentialRecord,
  type CredentialTransport,
  type SessionRecord,
} from '../../model/types';

export interface InvitationRow {
  readonly expires_at: number;
  readonly consumed_at: number | null;
}

export interface CeremonyRow {
  readonly id: string;
  readonly challenge_digest: string;
  readonly kind: string;
  readonly account_id: string | null;
  readonly invitation_digest: string | null;
  readonly rp_id: string;
  readonly origin: string;
  readonly expires_at: number;
  readonly consumed_at: number | null;
}

export interface CredentialRow {
  readonly id: string;
  readonly account_id: string;
  readonly public_key: string;
  readonly public_key_format: string;
  readonly algorithm: string;
  readonly counter: number;
  readonly transports_json: string;
  readonly name: string;
  readonly created_at: number;
  readonly revoked_at: number | null;
}

export interface SessionRow {
  readonly id: string;
  readonly token_digest: string;
  readonly account_id: string;
  readonly created_at: number;
  readonly expires_at: number;
  readonly revoked_at: number | null;
}

const transports = new Set<CredentialTransport>([
  'ble',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
]);

export function toCeremony(row: CeremonyRow): IdentityServerResult<CeremonyRecord> {
  if (row.kind !== 'registration' && row.kind !== 'authentication') return failed('internal');
  return {
    ok: true,
    value: {
      id: asCeremonyId(row.id),
      challengeDigest: asSecretDigest(row.challenge_digest),
      kind: row.kind,
      accountId: row.account_id === null ? null : asAccountId(row.account_id),
      invitationDigest:
        row.invitation_digest === null ? null : asSecretDigest(row.invitation_digest),
      rpId: row.rp_id,
      origin: row.origin,
      expiresAt: asTimestamp(row.expires_at),
      consumedAt: row.consumed_at === null ? null : asTimestamp(row.consumed_at),
    },
  };
}

export function toCredential(row: CredentialRow): IdentityServerResult<CredentialRecord> {
  if (row.algorithm !== 'ES256' && row.algorithm !== 'RS256' && row.algorithm !== 'EdDSA') {
    return failed('internal');
  }
  if (row.public_key_format !== 'cose' && row.public_key_format !== 'spki') {
    return failed('internal');
  }
  const decodedTransports = decodeTransports(row.transports_json);
  if (!decodedTransports) return failed('internal');
  return {
    ok: true,
    value: {
      id: asCredentialId(row.id),
      accountId: asAccountId(row.account_id),
      publicKey: row.public_key,
      publicKeyFormat: row.public_key_format,
      algorithm: row.algorithm,
      counter: row.counter,
      transports: decodedTransports,
      name: row.name,
      createdAt: asTimestamp(row.created_at),
      revokedAt: row.revoked_at === null ? null : asTimestamp(row.revoked_at),
    },
  };
}

export function toSession(row: SessionRow): SessionRecord {
  return {
    id: asSessionId(row.id),
    tokenDigest: asSecretDigest(row.token_digest),
    accountId: asAccountId(row.account_id),
    createdAt: asTimestamp(row.created_at),
    expiresAt: asTimestamp(row.expires_at),
    revokedAt: row.revoked_at === null ? null : asTimestamp(row.revoked_at),
  };
}

function decodeTransports(value: string): readonly CredentialTransport[] | null {
  try {
    const decoded: unknown = JSON.parse(value);
    return Array.isArray(decoded) && decoded.every((item) => transports.has(item)) ? decoded : null;
  } catch {
    return null;
  }
}
