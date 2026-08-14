import type { GuidanceApiFailure, GuidanceApiSuccess, GuidanceErrorCode } from './types';

export const guidanceSucceeded = <T>(data: T, requestId: string): GuidanceApiSuccess<T> => ({
  ok: true,
  data,
  requestId,
});

export const guidanceFailed = (
  code: GuidanceErrorCode,
  retryable: boolean,
  requestId: string
): GuidanceApiFailure => ({
  ok: false,
  error: { code, retryable },
  requestId,
});
