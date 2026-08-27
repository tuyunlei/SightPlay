export type IdentityErrorCode =
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

export interface ApiFailure {
  readonly ok: false;
  readonly error: {
    readonly code: IdentityErrorCode;
    readonly retryable: boolean;
  };
  readonly requestId: string;
}

export interface ApiSuccess<T> {
  readonly ok: true;
  readonly data: T;
  readonly requestId: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface SessionSnapshotDto {
  readonly authenticated: boolean;
  readonly hasPasskeys: boolean;
}

export interface OperationCompletedDto {
  readonly completed: true;
}

export interface CredentialSummaryDto {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
}

export interface InvitationCodesDto {
  readonly codes: readonly string[];
}

export interface InvitationAccessSummaryDto {
  readonly id: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}

export interface InvitationAccessSnapshotDto {
  readonly credential: InvitationAccessSummaryDto | null;
}

export interface IssuedInvitationAccessDto {
  readonly token: string;
  readonly credential: InvitationAccessSummaryDto;
}

export type PasskeyTransportDto = 'ble' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb';

export type UserVerificationDto = 'required' | 'preferred' | 'discouraged';

export interface LoginOptionsDto {
  readonly challenge: string;
  readonly rpId: string;
  readonly allowCredentials: readonly {
    readonly id: string;
    readonly transports: readonly PasskeyTransportDto[];
  }[];
  readonly userVerification?: UserVerificationDto;
  readonly timeout?: number;
}

export interface RegistrationOptionsDto {
  readonly challenge: string;
  readonly user: { readonly id: string; readonly name: string; readonly displayName: string };
  readonly rp: { readonly id: string; readonly name: string };
  readonly pubKeyCredParams: readonly { readonly type: 'public-key'; readonly alg: number }[];
  readonly authenticatorSelection?: {
    readonly residentKey?: 'discouraged' | 'preferred' | 'required';
    readonly userVerification?: UserVerificationDto;
  };
  readonly timeout?: number;
}

export interface RegistrationOptionsRequest {
  readonly inviteCode: string;
}

export interface RegistrationVerificationRequest {
  readonly response: Readonly<Record<string, unknown>>;
  readonly inviteCode: string;
  readonly name?: string;
}

export interface LoginVerificationRequest {
  readonly response: Readonly<Record<string, unknown>>;
}
