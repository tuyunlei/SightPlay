import { failed, accepted, type IdentityServerResult } from '../model/failure';
import {
  asAccountId,
  asCredentialId,
  asTimestamp,
  type AccountRecord,
  type CredentialAlgorithm,
  type CredentialRecord,
  type CredentialTransport,
} from '../model/types';

export interface LegacyIdentityImport {
  readonly account: AccountRecord;
  readonly credentials: readonly CredentialRecord[];
}

const algorithms = new Set<CredentialAlgorithm>(['ES256', 'RS256', 'EdDSA']);
const transports = new Set<CredentialTransport>([
  'ble',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
]);

export function decodeLegacyCredentialExport(
  value: unknown,
  accountId = 'legacy-owner'
): IdentityServerResult<LegacyIdentityImport> {
  if (!Array.isArray(value) || value.length === 0) return failed('invalidRequest');
  const credentials = value.map((item) => decodeCredential(item, accountId));
  if (credentials.some((credential) => credential === null)) return failed('invalidRequest');
  const decoded = credentials.filter((credential): credential is CredentialRecord => !!credential);
  if (new Set(decoded.map(({ id }) => id)).size !== decoded.length) {
    return failed('credentialConflict');
  }
  const createdAt = Math.min(...decoded.map((credential) => credential.createdAt));
  return accepted({
    account: { id: asAccountId(accountId), status: 'active', createdAt: asTimestamp(createdAt) },
    credentials: decoded,
  });
}

function decodeCredential(value: unknown, accountId: string): CredentialRecord | null {
  if (!isRecord(value)) return null;
  const id = boundedString(value.id, 1, Number.MAX_SAFE_INTEGER);
  const publicKey = boundedString(value.publicKey, 1, Number.MAX_SAFE_INTEGER);
  const counter = integer(value.counter, 0);
  const name = boundedString(value.name, 1, 80);
  const createdAt = integer(value.createdAt, 1);
  const algorithm = decodeAlgorithm(value.algorithm);
  const decodedTransports = decodeTransports(value.transports);
  if (
    !id ||
    !publicKey ||
    counter === null ||
    !name ||
    createdAt === null ||
    !algorithm ||
    !decodedTransports
  ) {
    return null;
  }
  return {
    id: asCredentialId(id),
    accountId: asAccountId(accountId),
    publicKey,
    publicKeyFormat: 'spki',
    algorithm,
    counter,
    transports: decodedTransports,
    name,
    createdAt: asTimestamp(createdAt),
    revokedAt: null,
  };
}

function boundedString(value: unknown, minimum: number, maximum: number): string | null {
  return typeof value === 'string' && value.length >= minimum && value.length <= maximum
    ? value
    : null;
}

function integer(value: unknown, minimum: number): number | null {
  return Number.isSafeInteger(value) && Number(value) >= minimum ? Number(value) : null;
}

function decodeAlgorithm(value: unknown): CredentialAlgorithm | null {
  const candidate = value ?? 'ES256';
  return algorithms.has(candidate as CredentialAlgorithm)
    ? (candidate as CredentialAlgorithm)
    : null;
}

function decodeTransports(value: unknown): readonly CredentialTransport[] | null {
  const candidate = value ?? [];
  return Array.isArray(candidate) &&
    candidate.every((transport) => transports.has(transport as CredentialTransport))
    ? (candidate as CredentialTransport[])
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
