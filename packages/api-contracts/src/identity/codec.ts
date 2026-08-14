import { decoded, isRecord, rejected, type DecodeResult } from '../codec';

import type {
  ApiFailure,
  ApiResult,
  CredentialSummaryDto,
  InvitationCodesDto,
  LoginOptionsDto,
  LoginVerificationRequest,
  OperationCompletedDto,
  PasskeyTransportDto,
  RegistrationOptionsDto,
  RegistrationOptionsRequest,
  RegistrationVerificationRequest,
  SessionSnapshotDto,
  UserVerificationDto,
} from './types';

const errorCodes = new Set([
  'invalidRequest',
  'originRejected',
  'authenticationRequired',
  'invitationInvalid',
  'invitationUsed',
  'invitationExpired',
  'invitationConflict',
  'ceremonyInvalid',
  'ceremonyExpired',
  'ceremonyReplayed',
  'credentialNotFound',
  'credentialConflict',
  'verificationRejected',
  'lastCredential',
  'counterRegression',
  'sessionInvalid',
  'rateLimited',
  'internal',
]);

export function decodeApiFailure(value: unknown): DecodeResult<ApiFailure> {
  if (!isRecord(value) || value.ok !== false || !isRecord(value.error)) {
    return rejected('Expected an Identity API failure envelope');
  }
  const { code, retryable } = value.error;
  const { requestId } = value;
  if (!errorCodes.has(String(code)) || typeof retryable !== 'boolean') {
    return rejected('Identity API failure has an invalid code or retryability');
  }
  if (typeof requestId !== 'string') return rejected('Identity API failure requires requestId');
  return decoded({
    ok: false,
    error: {
      code: code as ApiFailure['error']['code'],
      retryable,
    },
    requestId,
  });
}

export function decodeApiResult<T>(
  value: unknown,
  decodeData: (input: unknown) => DecodeResult<T>
): DecodeResult<ApiResult<T>> {
  const failure = decodeApiFailure(value);
  if (failure.ok) return failure;
  if (!isRecord(value) || value.ok !== true || typeof value.requestId !== 'string') {
    return rejected('Expected an Identity API result envelope');
  }
  const data = decodeData(value.data);
  return data.ok
    ? decoded({ ok: true, data: data.value, requestId: value.requestId })
    : rejected(data.issue);
}

export function decodeSessionSnapshot(value: unknown): DecodeResult<SessionSnapshotDto> {
  if (
    !isRecord(value) ||
    typeof value.authenticated !== 'boolean' ||
    typeof value.hasPasskeys !== 'boolean'
  ) {
    return rejected('Session snapshot requires authenticated and hasPasskeys booleans');
  }
  return decoded({ authenticated: value.authenticated, hasPasskeys: value.hasPasskeys });
}

export function decodeOperationCompleted(value: unknown): DecodeResult<OperationCompletedDto> {
  return isRecord(value) && value.completed === true
    ? decoded({ completed: true })
    : rejected('Operation result requires completed=true');
}

export function decodeCredentialSummaries(
  value: unknown
): DecodeResult<readonly CredentialSummaryDto[]> {
  if (!Array.isArray(value)) return rejected('Credential summaries must be an array');
  const credentials = value.flatMap((item) =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.createdAt === 'number'
      ? [{ id: item.id, name: item.name, createdAt: item.createdAt }]
      : []
  );
  return credentials.length === value.length
    ? decoded(credentials)
    : rejected('Credential summaries contain an invalid item');
}

export function decodeInvitationCodes(value: unknown): DecodeResult<InvitationCodesDto> {
  return isRecord(value) &&
    Array.isArray(value.codes) &&
    value.codes.length > 0 &&
    value.codes.every((code) => typeof code === 'string')
    ? decoded({ codes: value.codes })
    : rejected('Invitation result requires at least one code');
}

const parseUserVerification = (value: unknown): UserVerificationDto | undefined =>
  value === 'required' || value === 'preferred' || value === 'discouraged' ? value : undefined;

const parseTransport = (value: unknown): value is PasskeyTransportDto =>
  value === 'ble' ||
  value === 'hybrid' ||
  value === 'internal' ||
  value === 'nfc' ||
  value === 'smart-card' ||
  value === 'usb';

export function decodeLoginOptions(value: unknown): DecodeResult<LoginOptionsDto> {
  if (
    !isRecord(value) ||
    typeof value.challenge !== 'string' ||
    typeof value.rpId !== 'string' ||
    value.rpId.length === 0
  ) {
    return rejected('Login options require a challenge and RP ID');
  }
  if (!Array.isArray(value.allowCredentials)) {
    return rejected('Login options require an allowCredentials array');
  }
  const allowCredentials = value.allowCredentials.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'string') return [];
    if (item.transports !== undefined && !Array.isArray(item.transports)) return [];
    const rawTransports = item.transports ?? [];
    if (!Array.isArray(rawTransports) || !rawTransports.every(parseTransport)) return [];
    const transports = rawTransports;
    return [{ id: item.id, transports }];
  });
  if (allowCredentials.length !== value.allowCredentials.length) {
    return rejected('Login options contain an invalid credential descriptor');
  }
  const userVerification = parseUserVerification(value.userVerification);
  if (value.userVerification !== undefined && userVerification === undefined) {
    return rejected('Login options contain an invalid userVerification policy');
  }
  if (value.timeout !== undefined && typeof value.timeout !== 'number') {
    return rejected('Login options timeout must be numeric');
  }
  return decoded({
    challenge: value.challenge,
    rpId: value.rpId,
    allowCredentials,
    ...(userVerification ? { userVerification } : {}),
    ...(typeof value.timeout === 'number' ? { timeout: value.timeout } : {}),
  });
}

function decodeRegistrationUser(value: unknown): RegistrationOptionsDto['user'] | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.displayName !== 'string'
  ) {
    return null;
  }
  return { id: value.id, name: value.name, displayName: value.displayName };
}

function decodeRegistrationRp(value: unknown): RegistrationOptionsDto['rp'] | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string')
    return null;
  return { id: value.id, name: value.name };
}

function decodeCredentialParameters(
  value: unknown
): RegistrationOptionsDto['pubKeyCredParams'] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parameters = value.flatMap((item) =>
    isRecord(item) && item.type === 'public-key' && typeof item.alg === 'number'
      ? [{ type: 'public-key' as const, alg: item.alg }]
      : []
  );
  return parameters.length === value.length ? parameters : null;
}

function decodeAuthenticatorSelection(
  value: unknown
): DecodeResult<RegistrationOptionsDto['authenticatorSelection']> {
  if (value === undefined) return decoded(undefined);
  if (!isRecord(value)) return rejected('Authenticator selection must be an object');
  const residentKey =
    value.residentKey === 'required' ||
    value.residentKey === 'preferred' ||
    value.residentKey === 'discouraged'
      ? value.residentKey
      : undefined;
  const userVerification = parseUserVerification(value.userVerification);
  if (value.residentKey !== undefined && residentKey === undefined) {
    return rejected('Authenticator selection contains an invalid residentKey policy');
  }
  if (value.userVerification !== undefined && userVerification === undefined) {
    return rejected('Authenticator selection contains an invalid userVerification policy');
  }
  return decoded({
    ...(residentKey ? { residentKey } : {}),
    ...(userVerification ? { userVerification } : {}),
  });
}

export function decodeRegistrationOptions(value: unknown): DecodeResult<RegistrationOptionsDto> {
  if (!isRecord(value) || typeof value.challenge !== 'string') {
    return rejected('Registration options require a challenge');
  }
  const user = decodeRegistrationUser(value.user);
  const rp = decodeRegistrationRp(value.rp);
  const pubKeyCredParams = decodeCredentialParameters(value.pubKeyCredParams);
  const selection = decodeAuthenticatorSelection(value.authenticatorSelection);
  if (!user || !rp || !pubKeyCredParams || !selection.ok) {
    return rejected('Registration options contain an invalid required field');
  }
  if (value.timeout !== undefined && typeof value.timeout !== 'number') {
    return rejected('Registration options timeout must be numeric');
  }
  return decoded({
    challenge: value.challenge,
    user,
    rp,
    pubKeyCredParams,
    ...(selection.value ? { authenticatorSelection: selection.value } : {}),
    ...(typeof value.timeout === 'number' ? { timeout: value.timeout } : {}),
  });
}

export function decodeRegistrationOptionsRequest(
  value: unknown
): DecodeResult<RegistrationOptionsRequest> {
  return isRecord(value) && typeof value.inviteCode === 'string'
    ? decoded({ inviteCode: value.inviteCode })
    : rejected('Registration options request requires inviteCode');
}

export function decodeRegistrationVerificationRequest(
  value: unknown
): DecodeResult<RegistrationVerificationRequest> {
  if (
    !isRecord(value) ||
    !isRecord(value.response) ||
    typeof value.inviteCode !== 'string' ||
    (value.name !== undefined && typeof value.name !== 'string')
  ) {
    return rejected('Registration verification request is malformed');
  }
  return decoded({
    response: value.response,
    inviteCode: value.inviteCode,
    ...(value.name === undefined ? {} : { name: value.name }),
  });
}

export function decodeLoginVerificationRequest(
  value: unknown
): DecodeResult<LoginVerificationRequest> {
  return isRecord(value) && isRecord(value.response)
    ? decoded({ response: value.response })
    : rejected('Login verification request requires a response object');
}
