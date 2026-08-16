import type {
  IdentityFailure,
  LoginOptions,
  RegistrationOptions,
  SerializedPasskey,
  SessionSnapshot,
} from './model/types';

export type PortResult<T> = { ok: true; value: T } | { ok: false; failure: IdentityFailure };

export interface IdentityApiPort {
  loadSession(signal: AbortSignal): Promise<PortResult<SessionSnapshot>>;
  requestLoginOptions(signal: AbortSignal): Promise<PortResult<LoginOptions>>;
  verifyLogin(credential: SerializedPasskey, signal: AbortSignal): Promise<PortResult<undefined>>;
  requestRegistrationOptions(
    inviteCode: string,
    signal: AbortSignal
  ): Promise<PortResult<RegistrationOptions>>;
  verifyRegistration(
    input: { credential: SerializedPasskey; inviteCode: string; name?: string },
    signal: AbortSignal
  ): Promise<PortResult<undefined>>;
  logout(signal: AbortSignal): Promise<PortResult<undefined>>;
}

export interface PasskeyPort {
  isSupported(): boolean;
  authenticate(options: LoginOptions): Promise<PortResult<SerializedPasskey>>;
  register(options: RegistrationOptions): Promise<PortResult<SerializedPasskey>>;
}

export interface IdentityTelemetryPort {
  reportFailure(event: { operationId: number; operation: string; failure: IdentityFailure }): void;
}

export interface IdentityPorts {
  api: IdentityApiPort;
  passkey: PasskeyPort;
  telemetry: IdentityTelemetryPort;
}
