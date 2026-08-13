import { apiFailed, apiSucceeded, type IdentityErrorCode } from '@sightplay/api-contracts';
import type {
  AuthenticatedSession,
  IdentityServerFailure,
  IdentityServerResult,
  IdentityUseCaseDependencies,
} from '@sightplay/identity-server';
import { acceptsOrigin, authenticateSession } from '@sightplay/identity-server';

import type { PlatformContext } from '../../platform';
import { createRequestContext, logError } from '../../utils/logger';

const SESSION_COOKIE = 'sightplay_session';

export interface IdentityRequest {
  readonly platform: PlatformContext;
  readonly dependencies: IdentityUseCaseDependencies;
  readonly requestId: string;
  readonly origin: string;
  readonly source: string;
}

export function createIdentityRequest(
  platform: PlatformContext,
  dependencies: IdentityUseCaseDependencies
): IdentityRequest {
  const context = createRequestContext(platform.request);
  return {
    platform,
    dependencies,
    requestId: context.requestId,
    origin: platform.request.headers.get('Origin') ?? new URL(platform.request.url).origin,
    source: platform.clientAddress ?? 'unknown',
  };
}

export async function readUnknownJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function successResponse<T>(data: T, requestId: string, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(apiSucceeded(data, requestId)), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function resultResponse<T>(
  result: IdentityServerResult<T>,
  requestId: string,
  headers?: HeadersInit
): Response {
  return result.ok
    ? successResponse(result.value, requestId, headers)
    : failureResponse(result.failure, requestId);
}

export function failureResponse(failure: IdentityServerFailure, requestId: string): Response {
  return new Response(
    JSON.stringify(apiFailed(failure.code as IdentityErrorCode, failure.retryable, requestId)),
    {
      status: statusForFailure(failure),
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export function invalidRequestResponse(requestId: string): Response {
  return failureResponse({ code: 'invalidRequest', retryable: false }, requestId);
}

export function internalFailureResponse(
  operation: string,
  error: unknown,
  platform: PlatformContext,
  requestId: string
): Response {
  logError(operation, error, createRequestContext(platform.request));
  return failureResponse({ code: 'internal', retryable: true }, requestId);
}

export function readSessionToken(request: Request): string | null {
  const cookies = request.headers.get('Cookie')?.split(';') ?? [];
  for (const cookie of cookies) {
    const [name, ...parts] = cookie.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(parts.join('='));
  }
  return null;
}

export async function authenticateIdentityRequest(
  request: IdentityRequest,
  requireOrigin = false
): Promise<IdentityServerResult<AuthenticatedSession>> {
  if (requireOrigin && !acceptsOrigin(request.dependencies.policy, request.origin)) {
    return { ok: false, failure: { code: 'originRejected', retryable: false } };
  }
  const token = readSessionToken(request.platform.request);
  return token
    ? authenticateSession(token, request.dependencies)
    : { ok: false, failure: { code: 'authenticationRequired', retryable: false } };
}

export function sessionCookie(token: string, expiresAt: number, request: Request): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Expires=${new Date(expiresAt).toUTCString()}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function clearSessionCookie(request: Request): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function onRequestOptions(): Response {
  return new Response(null, { status: 204, headers: { Allow: 'GET, POST, DELETE, OPTIONS' } });
}

function statusForFailure(failure: IdentityServerFailure): number {
  if (failure.code === 'authenticationRequired' || failure.code === 'sessionInvalid') return 401;
  if (failure.code === 'originRejected') return 403;
  if (failure.code === 'credentialNotFound') return 404;
  if (failure.code === 'rateLimited') return 429;
  if (failure.code === 'internal') return 500;
  return 400;
}
