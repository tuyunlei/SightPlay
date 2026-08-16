import { acceptsOrigin, revokeSession } from '@sightplay/identity-server';

import type { PlatformContext } from '../../platform';

import {
  clearSessionCookie,
  createIdentityRequest,
  failureResponse,
  internalFailureResponse,
  readSessionToken,
  resultResponse,
} from './identity-http';
import { createIdentityDependencies } from './identity-runtime';

export async function handlePostLogout(platform: PlatformContext): Promise<Response> {
  const requestId = platform.request.headers.get('X-Request-Id') ?? crypto.randomUUID();
  try {
    const dependencies = createIdentityDependencies(platform);
    const request = createIdentityRequest(platform, dependencies);
    if (!acceptsOrigin(dependencies.policy, request.origin)) {
      return failureResponse({ code: 'originRejected', retryable: false }, request.requestId);
    }
    const token = readSessionToken(platform.request);
    if (!token) {
      return failureResponse({ code: 'sessionInvalid', retryable: false }, request.requestId);
    }
    const result = await revokeSession(token, dependencies);
    return resultResponse(
      result.ok ? { ok: true, value: { completed: true as const } } : result,
      request.requestId,
      result.ok ? { 'Set-Cookie': clearSessionCookie(platform.request) } : undefined
    );
  } catch (error) {
    return internalFailureResponse('identity.logout', error, platform, requestId);
  }
}
