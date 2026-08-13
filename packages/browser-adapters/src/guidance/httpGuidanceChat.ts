import {
  decodeChatApiResult,
  readUnknownJson,
  type GuidanceApiFailure,
} from '@sightplay/api-contracts';
import type {
  GuidanceChatFailure,
  GuidanceChatPort,
  GuidanceChatResult,
} from '@sightplay/guidance';

export type GuidanceFetch = typeof fetch;

export function createHttpGuidanceChat(fetcher: GuidanceFetch = fetch): GuidanceChatPort {
  return {
    async request(request, signal): Promise<GuidanceChatResult> {
      try {
        const response = await fetcher('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            message: request.message,
            clef: request.context.clef,
            lang: request.context.language,
          }),
          signal,
        });
        const decoded = decodeChatApiResult(await readUnknownJson(response));
        if (!decoded.ok) return { ok: false, failure: 'invalidResponse' };
        return decoded.value.ok
          ? { ok: true, reply: decoded.value.data }
          : { ok: false, failure: mapFailure(decoded.value) };
      } catch (error) {
        return {
          ok: false,
          failure: signal.aborted || isAbortError(error) ? 'cancelled' : 'providerUnavailable',
        };
      }
    },
  };
}

function mapFailure(failure: GuidanceApiFailure): GuidanceChatFailure {
  if (failure.error.code === 'unauthorized') return 'unauthorized';
  if (failure.error.code === 'provider_unavailable') return 'providerUnavailable';
  if (
    failure.error.code === 'invalid_request' ||
    failure.error.code === 'invalid_provider_response'
  ) {
    return 'invalidResponse';
  }
  return 'internal';
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
