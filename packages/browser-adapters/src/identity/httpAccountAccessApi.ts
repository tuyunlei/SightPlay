import type {
  AccountAccessApiPort,
  AccountAccessFailureCode,
  AccountAccessResult,
} from '@sightplay/account-access-client';
import {
  decodeApiResult,
  decodeCredentialSummaries,
  decodeInvitationCodes,
  decodeOperationCompleted,
  readUnknownJson,
  type DecodeResult,
} from '@sightplay/api-contracts';

type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const failure = <T>(code: AccountAccessFailureCode, retryable = true): AccountAccessResult<T> => ({
  ok: false,
  failure: { code, retryable },
});

async function requestJson<T>(
  fetchPort: FetchPort,
  input: RequestInfo | URL,
  init: RequestInit,
  rejectedCode: AccountAccessFailureCode,
  parse: (value: unknown) => DecodeResult<T>
): Promise<AccountAccessResult<T>> {
  try {
    const response = await fetchPort(input, init);
    const decoded = decodeApiResult(await readUnknownJson(response), parse);
    if (!decoded.ok || decoded.value.ok !== response.ok) return failure('invalidResponse');
    return decoded.value.ok
      ? { ok: true, value: decoded.value.data }
      : failure(rejectedCode, decoded.value.error.retryable);
  } catch {
    return failure('connectionUnavailable');
  }
}

class HttpAccountAccessApi implements AccountAccessApiPort {
  constructor(private readonly fetchPort: FetchPort) {}

  listCredentials(signal: AbortSignal) {
    return requestJson(
      this.fetchPort,
      '/api/auth/passkeys',
      { credentials: 'include', signal },
      'credentialsUnavailable',
      decodeCredentialSummaries
    );
  }

  async createInvitation(signal: AbortSignal): Promise<AccountAccessResult<string>> {
    const result = await requestJson(
      this.fetchPort,
      '/api/auth/invite',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1 }),
        signal,
      },
      'invitationRejected',
      decodeInvitationCodes
    );
    return result.ok ? { ok: true, value: result.value.codes[0] } : result;
  }

  async revokeCredential(
    credentialId: string,
    signal: AbortSignal
  ): Promise<AccountAccessResult<undefined>> {
    const result = await requestJson(
      this.fetchPort,
      `/api/auth/passkeys?id=${encodeURIComponent(credentialId)}`,
      { method: 'DELETE', credentials: 'include', signal },
      'credentialRevocationRejected',
      decodeOperationCompleted
    );
    return result.ok ? { ok: true, value: undefined } : result;
  }
}

export function createHttpAccountAccessApi(fetchPort: FetchPort): AccountAccessApiPort {
  return new HttpAccountAccessApi(fetchPort);
}
