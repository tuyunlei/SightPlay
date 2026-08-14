type Brand<Value, Name extends string> = Value & { readonly __brand: Name };

export type AccountId = Brand<string, 'AccountId'>;
export type CredentialId = Brand<string, 'CredentialId'>;
export type CeremonyId = Brand<string, 'CeremonyId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type SecretDigest = Brand<string, 'SecretDigest'>;
export type Timestamp = Brand<number, 'Timestamp'>;

export type CeremonyKind = 'registration' | 'authentication';
export type CredentialAlgorithm = 'ES256' | 'RS256' | 'EdDSA';
export type CredentialPublicKeyFormat = 'cose' | 'spki';
export type CredentialTransport = 'ble' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb';

export interface AccountRecord {
  readonly id: AccountId;
  readonly status: 'active' | 'suspended';
  readonly createdAt: Timestamp;
}

export interface CredentialRecord {
  readonly id: CredentialId;
  readonly accountId: AccountId;
  readonly publicKey: string;
  readonly publicKeyFormat: CredentialPublicKeyFormat;
  readonly algorithm: CredentialAlgorithm;
  readonly counter: number;
  readonly transports: readonly CredentialTransport[];
  readonly name: string;
  readonly createdAt: Timestamp;
  readonly revokedAt: Timestamp | null;
}

export interface InvitationRecord {
  readonly codeDigest: SecretDigest;
  readonly purpose: 'createAccount';
  readonly issuerAccountId: AccountId | null;
  readonly expiresAt: Timestamp;
  readonly consumedAt: Timestamp | null;
  readonly consumedByAccountId: AccountId | null;
}

export interface CeremonyRecord {
  readonly id: CeremonyId;
  readonly challengeDigest: SecretDigest;
  readonly kind: CeremonyKind;
  readonly accountId: AccountId | null;
  readonly invitationDigest: SecretDigest | null;
  readonly rpId: string;
  readonly origin: string;
  readonly expiresAt: Timestamp;
  readonly consumedAt: Timestamp | null;
}

export interface SessionRecord {
  readonly id: SessionId;
  readonly tokenDigest: SecretDigest;
  readonly accountId: AccountId;
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly revokedAt: Timestamp | null;
}

export const asAccountId = (value: string): AccountId => value as AccountId;
export const asCredentialId = (value: string): CredentialId => value as CredentialId;
export const asCeremonyId = (value: string): CeremonyId => value as CeremonyId;
export const asSessionId = (value: string): SessionId => value as SessionId;
export const asSecretDigest = (value: string): SecretDigest => value as SecretDigest;
export const asTimestamp = (value: number): Timestamp => value as Timestamp;
