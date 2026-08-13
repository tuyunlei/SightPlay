import { asCredentialId, listCredentials, revokeCredential } from '@sightplay/identity-server';

import type { PlatformContext } from '../../platform';

import {
  authenticateIdentityRequest,
  createIdentityRequest,
  internalFailureResponse,
  invalidRequestResponse,
  resultResponse,
} from './identity-http';
import { createIdentityDependencies } from './identity-runtime';

export async function handleGetPasskeys(platform: PlatformContext): Promise<Response> {
  return handlePasskeys(platform, async (request) => {
    const session = await authenticateIdentityRequest(request);
    if (!session.ok) return resultResponse(session, request.requestId);
    return resultResponse(
      await listCredentials(session.value.accountId, request.dependencies),
      request.requestId
    );
  });
}

export async function handleDeletePasskey(platform: PlatformContext): Promise<Response> {
  return handlePasskeys(platform, async (request) => {
    const session = await authenticateIdentityRequest(request, true);
    if (!session.ok) return resultResponse(session, request.requestId);
    const credentialId = new URL(platform.request.url).searchParams.get('id');
    if (!credentialId) return invalidRequestResponse(request.requestId);
    const result = await revokeCredential(
      session.value.accountId,
      asCredentialId(credentialId),
      request.dependencies
    );
    return resultResponse(
      result.ok ? { ok: true, value: { completed: true as const } } : result,
      request.requestId
    );
  });
}

async function handlePasskeys(
  platform: PlatformContext,
  operation: (request: ReturnType<typeof createIdentityRequest>) => Promise<Response>
): Promise<Response> {
  const requestId = platform.request.headers.get('X-Request-Id') ?? crypto.randomUUID();
  try {
    const dependencies = createIdentityDependencies(platform);
    return await operation(createIdentityRequest(platform, dependencies));
  } catch (error) {
    return internalFailureResponse('identity.passkeys', error, platform, requestId);
  }
}
