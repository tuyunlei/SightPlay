import { authenticateSession } from '@sightplay/identity-server';

import type { PlatformContext } from '../../platform';

import {
  createIdentityRequest,
  internalFailureResponse,
  onRequestOptions,
  readSessionToken,
  resultResponse,
} from './identity-http';
import { createIdentityDependencies } from './identity-runtime';

export { onRequestOptions };

export async function handleGetSession(platform: PlatformContext): Promise<Response> {
  const requestId = platform.request.headers.get('X-Request-Id') ?? crypto.randomUUID();
  try {
    const dependencies = createIdentityDependencies(platform);
    const request = createIdentityRequest(platform, dependencies);
    const hasCredentials = await dependencies.store.hasCredentials();
    if (!hasCredentials.ok) return resultResponse(hasCredentials, request.requestId);
    const token = readSessionToken(platform.request);
    const session = token ? await authenticateSession(token, dependencies) : null;
    if (session && !session.ok && session.failure.code !== 'sessionInvalid') {
      return resultResponse(session, request.requestId);
    }
    return resultResponse(
      {
        ok: true,
        value: { authenticated: session?.ok === true, hasPasskeys: hasCredentials.value },
      },
      request.requestId
    );
  } catch (error) {
    return internalFailureResponse('identity.session', error, platform, requestId);
  }
}
