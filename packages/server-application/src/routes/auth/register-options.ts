import { decodeRegistrationOptionsRequest } from '@sightplay/api-contracts';
import { beginRegistration } from '@sightplay/identity-server';

import type { PlatformContext } from '../../platform';

import {
  createIdentityRequest,
  internalFailureResponse,
  invalidRequestResponse,
  readUnknownJson,
  resultResponse,
} from './identity-http';
import { createIdentityDependencies } from './identity-runtime';

export async function handlePostRegisterOptions(platform: PlatformContext): Promise<Response> {
  const requestId = createRequestId(platform.request);
  try {
    const dependencies = createIdentityDependencies(platform);
    const request = createIdentityRequest(platform, dependencies);
    const decoded = decodeRegistrationOptionsRequest(await readUnknownJson(platform.request));
    if (!decoded.ok) return invalidRequestResponse(request.requestId);
    return resultResponse(
      await beginRegistration(
        { inviteCode: decoded.value.inviteCode, origin: request.origin, source: request.source },
        dependencies
      ),
      request.requestId
    );
  } catch (error) {
    return internalFailureResponse('identity.register-options', error, platform, requestId);
  }
}

function createRequestId(request: Request): string {
  return request.headers.get('X-Request-Id') ?? crypto.randomUUID();
}
