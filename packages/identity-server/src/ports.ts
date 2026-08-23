import type { IdentityServerResult } from './model/failure';
import type {
  AccountId,
  AccountRecord,
  CeremonyRecord,
  CredentialAlgorithm,
  CredentialId,
  CredentialRecord,
  CredentialTransport,
  InvitationRecord,
  InvitationAccessRecord,
  SecretDigest,
  SessionRecord,
  Timestamp,
} from './model/types';

export interface RegistrationContext {
  readonly ceremony: CeremonyRecord;
}

export interface AuthenticationContext {
  readonly ceremony: CeremonyRecord;
  readonly credential: CredentialRecord;
}

export interface CompleteRegistrationCommand {
  readonly now: Timestamp;
  readonly account: AccountRecord;
  readonly credential: CredentialRecord;
  readonly ceremonyId: CeremonyRecord['id'];
  readonly invitationDigest: SecretDigest;
  readonly session: SessionRecord;
}

export interface CompleteLoginCommand {
  readonly now: Timestamp;
  readonly ceremonyId: CeremonyRecord['id'];
  readonly credentialId: CredentialId;
  readonly nextCounter: number;
  readonly session: SessionRecord;
}

export interface IdentityStore {
  hasCredentials(): Promise<IdentityServerResult<boolean>>;
  validateInvitation(input: {
    readonly now: Timestamp;
    readonly invitationDigest: SecretDigest;
  }): Promise<IdentityServerResult<{ readonly expiresAt: Timestamp }>>;
  beginRegistration(input: {
    readonly now: Timestamp;
    readonly ceremony: CeremonyRecord;
  }): Promise<IdentityServerResult<undefined>>;
  createInvitations(
    invitations: readonly InvitationRecord[]
  ): Promise<IdentityServerResult<undefined>>;
  bootstrapInvitations(input: {
    readonly claimedAt: Timestamp;
    readonly invitations: readonly InvitationRecord[];
  }): Promise<IdentityServerResult<undefined>>;
  findRegistrationContext(input: {
    readonly now: Timestamp;
    readonly challengeDigest: SecretDigest;
    readonly invitationDigest: SecretDigest;
  }): Promise<IdentityServerResult<RegistrationContext>>;
  completeRegistration(
    command: CompleteRegistrationCommand
  ): Promise<IdentityServerResult<undefined>>;
  beginAuthentication(input: {
    readonly now: Timestamp;
    readonly ceremony: CeremonyRecord;
  }): Promise<IdentityServerResult<readonly CredentialRecord[]>>;
  findAuthenticationContext(input: {
    readonly now: Timestamp;
    readonly challengeDigest: SecretDigest;
    readonly credentialId: CredentialId;
  }): Promise<IdentityServerResult<AuthenticationContext>>;
  completeAuthentication(command: CompleteLoginCommand): Promise<IdentityServerResult<undefined>>;
  findSession(input: {
    readonly now: Timestamp;
    readonly tokenDigest: SecretDigest;
  }): Promise<IdentityServerResult<SessionRecord>>;
  revokeSession(input: {
    readonly now: Timestamp;
    readonly tokenDigest: SecretDigest;
  }): Promise<IdentityServerResult<undefined>>;
  listCredentials(accountId: AccountId): Promise<IdentityServerResult<readonly CredentialRecord[]>>;
  revokeCredential(input: {
    readonly accountId: AccountId;
    readonly credentialId: CredentialId;
    readonly now: Timestamp;
  }): Promise<IdentityServerResult<undefined>>;
  findInvitationAccess(input: {
    readonly now: Timestamp;
    readonly tokenDigest: SecretDigest;
  }): Promise<IdentityServerResult<InvitationAccessRecord>>;
  getInvitationAccess(
    accountId: AccountId,
    now: Timestamp
  ): Promise<IdentityServerResult<InvitationAccessRecord | null>>;
  replaceInvitationAccess(input: {
    readonly now: Timestamp;
    readonly credential: InvitationAccessRecord;
  }): Promise<IdentityServerResult<undefined>>;
  revokeInvitationAccess(input: {
    readonly accountId: AccountId;
    readonly now: Timestamp;
  }): Promise<IdentityServerResult<undefined>>;
}

export interface ClockPort {
  now(): Timestamp;
}

export interface IdentitySecretsPort {
  digest(value: string): Promise<SecretDigest>;
  createChallenge(): string;
  createInvitationCode(): string;
  createInvitationAccessToken(): string;
  createSessionToken(): string;
}

export interface IdentityIdsPort {
  createAccountId(): AccountId;
  createCeremonyId(): CeremonyRecord['id'];
  createSessionId(): SessionRecord['id'];
  createInvitationAccessId(): InvitationAccessRecord['id'];
}

export type IdentityRateLimitScope = 'source' | 'ceremony' | 'invitation' | 'account';

export interface IdentityRateLimitPort {
  consume(input: {
    readonly scope: IdentityRateLimitScope;
    readonly subjectDigest: SecretDigest;
    readonly now: Timestamp;
    readonly limit: number;
    readonly windowMs: number;
  }): Promise<IdentityServerResult<undefined>>;
}

export interface RegistrationVerification {
  readonly credentialId: CredentialId;
  readonly publicKey: string;
  readonly publicKeyFormat: CredentialRecord['publicKeyFormat'];
  readonly algorithm: CredentialAlgorithm;
  readonly counter: number;
  readonly transports: readonly CredentialTransport[];
  readonly authenticatorName: string;
}

export interface AuthenticationEnvelope {
  readonly challenge: string;
  readonly credentialId: CredentialId;
}

export interface WebAuthnServerPort {
  encodeUserHandle(accountId: AccountId): string;
  readRegistrationChallenge(
    response: Readonly<Record<string, unknown>>
  ): IdentityServerResult<string>;
  readAuthenticationEnvelope(
    response: Readonly<Record<string, unknown>>
  ): IdentityServerResult<AuthenticationEnvelope>;
  verifyRegistration(input: {
    readonly response: Readonly<Record<string, unknown>>;
    readonly challenge: string;
    readonly origin: string;
    readonly rpId: string;
    readonly userVerification: 'required' | 'preferred';
  }): Promise<IdentityServerResult<RegistrationVerification>>;
  verifyAuthentication(input: {
    readonly response: Readonly<Record<string, unknown>>;
    readonly challenge: string;
    readonly origin: string;
    readonly rpId: string;
    readonly userVerification: 'required' | 'preferred';
    readonly credential: CredentialRecord;
  }): Promise<IdentityServerResult<{ readonly counter: number }>>;
}

export interface IdentityServerPorts {
  readonly clock: ClockPort;
  readonly ids: IdentityIdsPort;
  readonly rateLimits: IdentityRateLimitPort;
  readonly secrets: IdentitySecretsPort;
  readonly store: IdentityStore;
  readonly webAuthn: WebAuthnServerPort;
}
