import type { ApiFailure, ApiSuccess, IdentityErrorCode } from './types';

export const apiSucceeded = <T>(data: T, requestId: string): ApiSuccess<T> => ({
  ok: true,
  data,
  requestId,
});

export const apiFailed = (
  code: IdentityErrorCode,
  retryable: boolean,
  requestId: string
): ApiFailure => ({
  ok: false,
  error: { code, retryable },
  requestId,
});
