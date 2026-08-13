import { beginAuthentication } from '@sightplay/identity-server';

import type { PlatformContext } from '../../platform';

import {
  createIdentityRequest,
  internalFailureResponse,
  onRequestOptions,
  resultResponse,
} from './identity-http';
import { createIdentityDependencies } from './identity-runtime';

export { onRequestOptions };

export async function handlePostLoginOptions(platform: PlatformContext): Promise<Response> {
  const requestId = platform.request.headers.get('X-Request-Id') ?? crypto.randomUUID();
  try {
    const dependencies = createIdentityDependencies(platform);
    const request = createIdentityRequest(platform, dependencies);
    return resultResponse(
      await beginAuthentication({ origin: request.origin, source: request.source }, dependencies),
      request.requestId
    );
  } catch (error) {
    return internalFailureResponse('identity.login-options', error, platform, requestId);
  }
}
