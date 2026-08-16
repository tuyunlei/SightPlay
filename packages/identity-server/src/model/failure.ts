export type IdentityServerFailureCode =
  | 'invalidRequest'
  | 'originRejected'
  | 'authenticationRequired'
  | 'invitationInvalid'
  | 'invitationUsed'
  | 'invitationExpired'
  | 'invitationConflict'
  | 'ceremonyInvalid'
  | 'ceremonyExpired'
  | 'ceremonyReplayed'
  | 'credentialNotFound'
  | 'credentialConflict'
  | 'verificationRejected'
  | 'lastCredential'
  | 'counterRegression'
  | 'sessionInvalid'
  | 'rateLimited'
  | 'internal';

export interface IdentityServerFailure {
  readonly code: IdentityServerFailureCode;
  readonly retryable: boolean;
}

export type IdentityServerResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: IdentityServerFailure };

export const accepted = <T>(value: T): IdentityServerResult<T> => ({ ok: true, value });

export const failed = (code: IdentityServerFailureCode, retryable = false) => ({
  ok: false as const,
  failure: { code, retryable },
});
