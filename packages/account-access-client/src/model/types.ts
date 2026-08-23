export interface CredentialSummary {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
}

export interface InvitationAccessSummary {
  readonly id: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}

export interface AccountAccessSnapshot {
  readonly credentials: readonly CredentialSummary[];
  readonly invitationAccess: InvitationAccessSummary | null;
}

export type AccountAccessFailureCode =
  | 'credentialsUnavailable'
  | 'invitationRejected'
  | 'credentialRevocationRejected'
  | 'invitationAccessRejected'
  | 'invalidResponse'
  | 'connectionUnavailable'
  | 'unknown';

export interface AccountAccessFailure {
  readonly code: AccountAccessFailureCode;
  readonly retryable: boolean;
}

export type AccountAccessOperation =
  | { readonly id: number; readonly kind: 'loadingAccountAccess' }
  | { readonly id: number; readonly kind: 'creatingInvitation' }
  | { readonly id: number; readonly kind: 'revokingCredential'; readonly credentialId: string }
  | { readonly id: number; readonly kind: 'creatingInvitationAccess' }
  | { readonly id: number; readonly kind: 'revokingInvitationAccess' };

export interface AccountAccessState {
  readonly credentials: readonly CredentialSummary[];
  readonly loaded: boolean;
  readonly invitationCode: string | null;
  readonly invitationAccess: InvitationAccessSummary | null;
  readonly invitationAccessToken: string | null;
  readonly operation: AccountAccessOperation | null;
  readonly failure: AccountAccessFailure | null;
  readonly nextOperationId: number;
}

export type AccountAccessIntent =
  | { readonly kind: 'started' }
  | { readonly kind: 'invitationRequested' }
  | { readonly kind: 'invitationDismissed' }
  | { readonly kind: 'credentialRevocationRequested'; readonly credentialId: string }
  | { readonly kind: 'invitationAccessRequested' }
  | { readonly kind: 'invitationAccessTokenDismissed' }
  | { readonly kind: 'invitationAccessRevocationRequested' }
  | { readonly kind: 'failureCleared' };

export type AccountAccessResultAction =
  | {
      readonly kind: 'accountAccessLoaded';
      readonly operationId: number;
      readonly snapshot: AccountAccessSnapshot;
    }
  | { readonly kind: 'invitationCreated'; readonly operationId: number; readonly code: string }
  | { readonly kind: 'credentialRevoked'; readonly operationId: number }
  | {
      readonly kind: 'invitationAccessCreated';
      readonly operationId: number;
      readonly token: string;
      readonly credential: InvitationAccessSummary;
    }
  | { readonly kind: 'invitationAccessRevoked'; readonly operationId: number }
  | {
      readonly kind: 'operationFailed';
      readonly operationId: number;
      readonly failure: AccountAccessFailure;
    };

export type AccountAccessAction = AccountAccessIntent | AccountAccessResultAction;

export type AccountAccessEffect =
  | { readonly kind: 'loadAccountAccess'; readonly operationId: number }
  | { readonly kind: 'createInvitation'; readonly operationId: number }
  | {
      readonly kind: 'revokeCredential';
      readonly operationId: number;
      readonly credentialId: string;
    }
  | { readonly kind: 'createInvitationAccess'; readonly operationId: number }
  | { readonly kind: 'revokeInvitationAccess'; readonly operationId: number };

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
  invitationAccess: null,
  invitationAccessToken: null,
  operation: null,
  failure: null,
  nextOperationId: 0,
};
