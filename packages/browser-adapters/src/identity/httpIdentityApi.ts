import type {
  IdentityApiPort,
  IdentityFailureCode,
  LoginOptions,
  PasskeyTransport,
  PortResult,
  RegistrationOptions,
  SessionSnapshot,
} from '@sightplay/identity-client';

type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const failure = <T>(code: IdentityFailureCode, retryable = true): PortResult<T> => ({
  ok: false,
  failure: { code, retryable },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseSession(value: unknown): PortResult<SessionSnapshot> {
  if (
    !isRecord(value) ||
    typeof value.authenticated !== 'boolean' ||
    typeof value.hasPasskeys !== 'boolean'
  ) {
    return failure('invalidResponse');
  }
  return {
    ok: true,
    value: { authenticated: value.authenticated, hasPasskeys: value.hasPasskeys },
  };
}

const parseUserVerification = (value: unknown): LoginOptions['userVerification'] =>
  value === 'required' || value === 'preferred' || value === 'discouraged' ? value : undefined;

const parseTransport = (value: unknown): value is PasskeyTransport =>
  value === 'ble' ||
  value === 'hybrid' ||
  value === 'internal' ||
  value === 'nfc' ||
  value === 'smart-card' ||
  value === 'usb';

function parseLoginOptions(value: unknown): PortResult<LoginOptions> {
  if (!isRecord(value) || typeof value.challenge !== 'string') return failure('invalidResponse');
  const credentials = Array.isArray(value.allowCredentials) ? value.allowCredentials : [];
  const allowCredentials = credentials.flatMap((credential) => {
    if (!isRecord(credential) || typeof credential.id !== 'string') return [];
    const transports = Array.isArray(credential.transports)
      ? credential.transports.filter(parseTransport)
      : [];
    return [{ id: credential.id, transports }];
  });
  const timeout = typeof value.timeout === 'number' ? value.timeout : undefined;
  return {
    ok: true,
    value: {
      challenge: value.challenge,
      allowCredentials,
      ...(parseUserVerification(value.userVerification)
        ? { userVerification: parseUserVerification(value.userVerification) }
        : {}),
      ...(timeout === undefined ? {} : { timeout }),
    },
  };
}

function parseRegistrationUser(value: unknown): RegistrationOptions['user'] | null {
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

function parseRegistrationRp(value: unknown): RegistrationOptions['rp'] | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null;
  }
  return { id: value.id, name: value.name };
}

function parseCredentialParameters(value: unknown): RegistrationOptions['pubKeyCredParams'] | null {
  if (!Array.isArray(value)) return null;
  const parameters = value.flatMap((item) =>
    isRecord(item) && item.type === 'public-key' && typeof item.alg === 'number'
      ? [{ type: 'public-key' as const, alg: item.alg }]
      : []
  );
  return parameters.length > 0 ? parameters : null;
}

function parseAuthenticatorSelection(
  value: unknown
): RegistrationOptions['authenticatorSelection'] {
  if (!isRecord(value)) return undefined;
  const residentKey =
    value.residentKey === 'required' ||
    value.residentKey === 'preferred' ||
    value.residentKey === 'discouraged'
      ? value.residentKey
      : undefined;
  const userVerification = parseUserVerification(value.userVerification);
  return residentKey || userVerification
    ? {
        ...(residentKey ? { residentKey } : {}),
        ...(userVerification ? { userVerification } : {}),
      }
    : undefined;
}

function parseRegistrationOptions(value: unknown): PortResult<RegistrationOptions> {
  if (!isRecord(value) || typeof value.challenge !== 'string') return failure('invalidResponse');
  const user = parseRegistrationUser(value.user);
  const rp = parseRegistrationRp(value.rp);
  const pubKeyCredParams = parseCredentialParameters(value.pubKeyCredParams);
  if (!user || !rp || !pubKeyCredParams) return failure('invalidResponse');
  const authenticatorSelection = parseAuthenticatorSelection(value.authenticatorSelection);
  return {
    ok: true,
    value: {
      challenge: value.challenge,
      user,
      rp,
      pubKeyCredParams,
      ...(authenticatorSelection ? { authenticatorSelection } : {}),
      ...(typeof value.timeout === 'number' ? { timeout: value.timeout } : {}),
    },
  };
}

async function requestJson<T>(
  fetchPort: FetchPort,
  input: RequestInfo | URL,
  init: RequestInit,
  rejectedCode: IdentityFailureCode,
  parse: (value: unknown) => PortResult<T>
): Promise<PortResult<T>> {
  try {
    const response = await fetchPort(input, init);
    if (!response.ok) return failure(rejectedCode);
    return parse(await readJson(response));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError')
      return failure('connectionUnavailable');
    return failure('connectionUnavailable');
  }
}

async function requestEmpty(
  fetchPort: FetchPort,
  input: RequestInfo | URL,
  init: RequestInit,
  rejectedCode: IdentityFailureCode
): Promise<PortResult<undefined>> {
  try {
    const response = await fetchPort(input, init);
    return response.ok ? { ok: true, value: undefined } : failure(rejectedCode);
  } catch {
    return failure('connectionUnavailable');
  }
}

const jsonHeaders = { 'Content-Type': 'application/json' };

class HttpIdentityApi implements IdentityApiPort {
  constructor(private readonly fetchPort: FetchPort) {}

  loadSession(signal: AbortSignal) {
    return requestJson(
      this.fetchPort,
      '/api/auth/session',
      { credentials: 'include', signal },
      'sessionUnavailable',
      parseSession
    );
  }

  requestLoginOptions(signal: AbortSignal) {
    return requestJson(
      this.fetchPort,
      '/api/auth/login-options',
      { method: 'POST', credentials: 'include', signal },
      'loginOptionsRejected',
      parseLoginOptions
    );
  }

  verifyLogin(credential: Parameters<IdentityApiPort['verifyLogin']>[0], signal: AbortSignal) {
    return requestEmpty(
      this.fetchPort,
      '/api/auth/login-verify',
      {
        method: 'POST',
        headers: jsonHeaders,
        credentials: 'include',
        signal,
        body: JSON.stringify({ response: credential.value }),
      },
      'loginVerificationRejected'
    );
  }

  requestRegistrationOptions(inviteCode: string, signal: AbortSignal) {
    return requestJson(
      this.fetchPort,
      '/api/auth/register-options',
      {
        method: 'POST',
        headers: jsonHeaders,
        credentials: 'include',
        signal,
        body: JSON.stringify({ inviteCode }),
      },
      'registrationOptionsRejected',
      parseRegistrationOptions
    );
  }

  verifyRegistration(
    input: Parameters<IdentityApiPort['verifyRegistration']>[0],
    signal: AbortSignal
  ) {
    return requestEmpty(
      this.fetchPort,
      '/api/auth/register-verify',
      {
        method: 'POST',
        headers: jsonHeaders,
        credentials: 'include',
        signal,
        body: JSON.stringify({
          response: input.credential.value,
          inviteCode: input.inviteCode,
          ...(input.name ? { name: input.name } : {}),
        }),
      },
      'registrationVerificationRejected'
    );
  }

  logout(signal: AbortSignal) {
    return requestEmpty(
      this.fetchPort,
      '/api/auth/logout',
      { method: 'POST', credentials: 'include', signal },
      'logoutRejected'
    );
  }
}

export function createHttpIdentityApi(fetchPort: FetchPort): IdentityApiPort {
  return new HttpIdentityApi(fetchPort);
}

export const identityHttpContract = { parseSession, parseLoginOptions, parseRegistrationOptions };
