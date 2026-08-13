export interface CredentialSummary {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
}

export type AccountAccessFailureCode =
  | 'credentialsUnavailable'
  | 'invitationRejected'
  | 'credentialRevocationRejected'
  | 'invalidResponse'
  | 'connectionUnavailable'
  | 'unknown';

export interface AccountAccessFailure {
  readonly code: AccountAccessFailureCode;
  readonly retryable: boolean;
}

export type AccountAccessOperation =
  | { readonly id: number; readonly kind: 'loadingCredentials' }
  | { readonly id: number; readonly kind: 'creatingInvitation' }
  | { readonly id: number; readonly kind: 'revokingCredential'; readonly credentialId: string };

export interface AccountAccessState {
  readonly credentials: readonly CredentialSummary[];
  readonly loaded: boolean;
  readonly invitationCode: string | null;
  readonly operation: AccountAccessOperation | null;
  readonly failure: AccountAccessFailure | null;
  readonly nextOperationId: number;
}

export type AccountAccessIntent =
  | { readonly kind: 'started' }
  | { readonly kind: 'invitationRequested' }
  | { readonly kind: 'invitationDismissed' }
  | { readonly kind: 'credentialRevocationRequested'; readonly credentialId: string }
  | { readonly kind: 'failureCleared' };

export type AccountAccessResultAction =
  | {
      readonly kind: 'credentialsLoaded';
      readonly operationId: number;
      readonly credentials: readonly CredentialSummary[];
    }
  | { readonly kind: 'invitationCreated'; readonly operationId: number; readonly code: string }
  | { readonly kind: 'credentialRevoked'; readonly operationId: number }
  | {
      readonly kind: 'operationFailed';
      readonly operationId: number;
      readonly failure: AccountAccessFailure;
    };

export type AccountAccessAction = AccountAccessIntent | AccountAccessResultAction;

export type AccountAccessEffect =
  | { readonly kind: 'loadCredentials'; readonly operationId: number }
  | { readonly kind: 'createInvitation'; readonly operationId: number }
  | {
      readonly kind: 'revokeCredential';
      readonly operationId: number;
      readonly credentialId: string;
    };

export type AccountAccessOutput = { readonly kind: 'credentialSetChanged' };

export interface AccountAccessTransition {
  readonly state: AccountAccessState;
  readonly effects: readonly AccountAccessEffect[];
  readonly outputs: readonly AccountAccessOutput[];
}

export const initialAccountAccessState: AccountAccessState = {
  credentials: [],
  loaded: false,
  invitationCode: null,
  operation: null,
  failure: null,
  nextOperationId: 0,
};
