import type {
  AccountAccessFailure,
  AccountAccessSnapshot,
  InvitationAccessSummary,
} from './model/types';

export type AccountAccessResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: AccountAccessFailure };

export interface AccountAccessApiPort {
  loadAccountAccess(signal: AbortSignal): Promise<AccountAccessResult<AccountAccessSnapshot>>;
  createInvitation(signal: AbortSignal): Promise<AccountAccessResult<string>>;
  revokeCredential(
    credentialId: string,
    signal: AbortSignal
  ): Promise<AccountAccessResult<undefined>>;
  createInvitationAccess(
    signal: AbortSignal
  ): Promise<
    AccountAccessResult<{ readonly token: string; readonly credential: InvitationAccessSummary }>
  >;
  revokeInvitationAccess(signal: AbortSignal): Promise<AccountAccessResult<undefined>>;
}

export interface AccountAccessPorts {
  readonly api: AccountAccessApiPort;
}
