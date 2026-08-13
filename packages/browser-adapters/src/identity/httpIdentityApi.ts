import {
  decodeApiResult,
  decodeLoginOptions,
  decodeOperationCompleted,
  decodeRegistrationOptions,
  decodeSessionSnapshot,
  type DecodeResult,
} from '@sightplay/api-contracts';
import type { IdentityApiPort, IdentityFailureCode, PortResult } from '@sightplay/identity-client';

type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const failure = <T>(code: IdentityFailureCode, retryable = true): PortResult<T> => ({
  ok: false,
  failure: { code, retryable },
});

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestJson<T>(
  fetchPort: FetchPort,
  input: RequestInfo | URL,
  init: RequestInit,
  rejectedCode: IdentityFailureCode,
  parse: (value: unknown) => DecodeResult<T>
): Promise<PortResult<T>> {
  try {
    const response = await fetchPort(input, init);
    const decoded = decodeApiResult(await readJson(response), parse);
    if (!decoded.ok || response.ok !== decoded.value.ok) return failure('invalidResponse');
    return decoded.value.ok
      ? { ok: true, value: decoded.value.data }
      : failure(rejectedCode, decoded.value.error.retryable);
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
  const result = await requestJson(fetchPort, input, init, rejectedCode, decodeOperationCompleted);
  return result.ok ? { ok: true, value: undefined } : result;
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
      decodeSessionSnapshot
    );
  }

  requestLoginOptions(signal: AbortSignal) {
    return requestJson(
      this.fetchPort,
      '/api/auth/login-options',
      { method: 'POST', credentials: 'include', signal },
      'loginOptionsRejected',
      decodeLoginOptions
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
      decodeRegistrationOptions
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

export const identityHttpContract = {
  parseSession: decodeSessionSnapshot,
  parseLoginOptions: decodeLoginOptions,
  parseRegistrationOptions: decodeRegistrationOptions,
};
