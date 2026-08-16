import type { LoginOptionsDto, RegistrationOptionsDto } from '@sightplay/api-contracts';

import type { IdentityServerResult } from '../model/failure';
import type { AccountId, CredentialId, Timestamp } from '../model/types';

export interface IssuedSession {
  readonly token: string;
  readonly expiresAt: Timestamp;
}

export interface AuthenticatedSession {
  readonly accountId: AccountId;
  readonly expiresAt: Timestamp;
}

export type BeginRegistrationResult = IdentityServerResult<RegistrationOptionsDto>;
export type BeginAuthenticationResult = IdentityServerResult<LoginOptionsDto>;
export type CompleteIdentityResult = IdentityServerResult<IssuedSession>;

export interface CredentialSummary {
  readonly id: CredentialId;
  readonly name: string;
  readonly createdAt: Timestamp;
}
