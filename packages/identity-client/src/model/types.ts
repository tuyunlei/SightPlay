export type IdentityFailureCode =
  | 'passkeysUnsupported'
  | 'userCanceled'
  | 'authenticatorUnavailable'
  | 'connectionUnavailable'
  | 'sessionUnavailable'
  | 'loginOptionsRejected'
  | 'loginVerificationRejected'
  | 'registrationOptionsRejected'
  | 'registrationVerificationRejected'
  | 'logoutRejected'
  | 'invalidResponse'
  | 'unknown';

export interface IdentityFailure {
  code: IdentityFailureCode;
  retryable: boolean;
}

export interface SessionSnapshot {
  authenticated: boolean;
  hasPasskeys: boolean;
}

export type UserVerification = 'required' | 'preferred' | 'discouraged';
export type PasskeyTransport = 'ble' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb';

export interface LoginCredentialDescriptor {
  id: string;
  transports: readonly PasskeyTransport[];
}

export interface LoginOptions {
  challenge: string;
  allowCredentials: readonly LoginCredentialDescriptor[];
  userVerification?: UserVerification;
  timeout?: number;
}

export interface RegistrationOptions {
  challenge: string;
  user: { id: string; name: string; displayName: string };
  rp: { id: string; name: string };
  pubKeyCredParams: readonly { type: 'public-key'; alg: number }[];
  authenticatorSelection?: {
    residentKey?: 'discouraged' | 'preferred' | 'required';
    userVerification?: UserVerification;
  };
  timeout?: number;
}

export interface SerializedPasskey {
  readonly value: Readonly<Record<string, unknown>>;
}

export type IdentitySession =
  | { kind: 'checking' }
  | { kind: 'anonymous'; hasPasskeys: boolean }
  | { kind: 'authenticated'; hasPasskeys: boolean };

export type IdentityOperation =
  | { id: number; kind: 'sessionCheck' | 'sessionRefresh'; phase: 'loading' }
  | {
      id: number;
      kind: 'login';
      phase:
        | 'checkingSupport'
        | 'requestingOptions'
        | 'authenticating'
        | 'verifying'
        | 'refreshing';
    }
  | {
      id: number;
      kind: 'registration';
      phase: 'checkingSupport' | 'requestingOptions' | 'registering' | 'verifying' | 'refreshing';
      inviteCode: string;
      name?: string;
    }
  | { id: number; kind: 'logout'; phase: 'requesting' };

export interface IdentityState {
  session: IdentitySession;
  operation: IdentityOperation | null;
  failure: IdentityFailure | null;
  nextOperationId: number;
}

export type IdentityIntent =
  | { kind: 'started' }
  | { kind: 'loginRequested' }
  | { kind: 'registrationRequested'; inviteCode: string; name?: string }
  | { kind: 'logoutRequested' }
  | { kind: 'sessionRefreshRequested' }
  | { kind: 'failureCleared' };

export type IdentityResultAction =
  | { kind: 'passkeySupportResolved'; operationId: number; supported: boolean }
  | { kind: 'loginOptionsReceived'; operationId: number; options: LoginOptions }
  | { kind: 'registrationOptionsReceived'; operationId: number; options: RegistrationOptions }
  | { kind: 'authenticationCreated'; operationId: number; credential: SerializedPasskey }
  | { kind: 'registrationCreated'; operationId: number; credential: SerializedPasskey }
  | { kind: 'verificationAccepted'; operationId: number }
  | { kind: 'sessionLoaded'; operationId: number; session: SessionSnapshot }
  | { kind: 'logoutCompleted'; operationId: number }
  | { kind: 'operationFailed'; operationId: number; failure: IdentityFailure };

export type IdentityAction = IdentityIntent | IdentityResultAction;

export type IdentityEffect =
  | { kind: 'checkPasskeySupport'; operationId: number }
  | { kind: 'loadSession'; operationId: number }
  | { kind: 'requestLoginOptions'; operationId: number }
  | { kind: 'authenticatePasskey'; operationId: number; options: LoginOptions }
  | { kind: 'verifyLogin'; operationId: number; credential: SerializedPasskey }
  | { kind: 'requestRegistrationOptions'; operationId: number; inviteCode: string }
  | { kind: 'createPasskey'; operationId: number; options: RegistrationOptions }
  | {
      kind: 'verifyRegistration';
      operationId: number;
      credential: SerializedPasskey;
      inviteCode: string;
      name?: string;
    }
  | { kind: 'logout'; operationId: number }
  | {
      kind: 'reportFailure';
      operationId: number;
      operation: IdentityOperation['kind'];
      failure: IdentityFailure;
    };

export interface IdentityTransition {
  state: IdentityState;
  effects: readonly IdentityEffect[];
}

export const initialIdentityState: IdentityState = {
  session: { kind: 'checking' },
  operation: null,
  failure: null,
  nextOperationId: 0,
};
