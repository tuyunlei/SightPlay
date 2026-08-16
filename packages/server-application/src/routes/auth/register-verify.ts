import { decodeRegistrationVerificationRequest } from '@sightplay/api-contracts';
import { completeRegistration } from '@sightplay/identity-server';

import type { PlatformContext } from '../../platform';

import {
  createIdentityRequest,
  internalFailureResponse,
  invalidRequestResponse,
  readUnknownJson,
  resultResponse,
  sessionCookie,
} from './identity-http';
import { createIdentityDependencies } from './identity-runtime';

export async function handlePostRegisterVerify(platform: PlatformContext): Promise<Response> {
  const requestId = platform.request.headers.get('X-Request-Id') ?? crypto.randomUUID();
  try {
    const dependencies = createIdentityDependencies(platform);
    const request = createIdentityRequest(platform, dependencies);
    const decoded = decodeRegistrationVerificationRequest(await readUnknownJson(platform.request));
    if (!decoded.ok) return invalidRequestResponse(request.requestId);
    const result = await completeRegistration(
      { ...decoded.value, origin: request.origin, source: request.source },
      dependencies
    );
    return resultResponse(
      result.ok ? { ok: true, value: { completed: true as const } } : result,
      request.requestId,
      result.ok
        ? {
            'Set-Cookie': sessionCookie(
              result.value.token,
              result.value.expiresAt,
              platform.request
            ),
          }
        : undefined
    );
  } catch (error) {
    return internalFailureResponse('identity.register-verify', error, platform, requestId);
  }
}
