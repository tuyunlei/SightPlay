import type { AccountAccessFailure, CredentialSummary } from './model/types';

export type AccountAccessResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: AccountAccessFailure };

export interface AccountAccessApiPort {
  listCredentials(signal: AbortSignal): Promise<AccountAccessResult<readonly CredentialSummary[]>>;
  createInvitation(signal: AbortSignal): Promise<AccountAccessResult<string>>;
  revokeCredential(
    credentialId: string,
    signal: AbortSignal
  ): Promise<AccountAccessResult<undefined>>;
}

export interface AccountAccessPorts {
  readonly api: AccountAccessApiPort;
}
