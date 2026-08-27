import {
  createInvitationAccess,
  getInvitationAccess,
  revokeInvitationAccess,
} from '@sightplay/identity-server';

import type { PlatformContext } from '../../platform';

import {
  authenticateIdentityRequest,
  createIdentityRequest,
  internalFailureResponse,
  resultResponse,
} from './identity-http';
import { createIdentityDependencies } from './identity-runtime';

export const handleGetInvitationAccess = (platform: PlatformContext) =>
  handleInvitationAccess(platform, async (request) => {
    const session = await authenticateIdentityRequest(request, true);
    if (!session.ok) return resultResponse(session, request.requestId);
    const result = await getInvitationAccess(session.value.accountId, request.dependencies);
    return resultResponse(
      result.ok ? { ok: true, value: { credential: result.value } } : result,
      request.requestId
    );
  });

export const handlePostInvitationAccess = (platform: PlatformContext) =>
  handleInvitationAccess(platform, async (request) => {
    const session = await authenticateIdentityRequest(request, true);
    if (!session.ok) return resultResponse(session, request.requestId);
    return resultResponse(
      await createInvitationAccess(session.value.accountId, request.dependencies),
      request.requestId
    );
  });

export const handleDeleteInvitationAccess = (platform: PlatformContext) =>
  handleInvitationAccess(platform, async (request) => {
    const session = await authenticateIdentityRequest(request, true);
    if (!session.ok) return resultResponse(session, request.requestId);
    const result = await revokeInvitationAccess(session.value.accountId, request.dependencies);
    return resultResponse(
      result.ok ? { ok: true, value: { completed: true as const } } : result,
      request.requestId
    );
  });

async function handleInvitationAccess(
  platform: PlatformContext,
  operation: (request: ReturnType<typeof createIdentityRequest>) => Promise<Response>
): Promise<Response> {
  const requestId = platform.request.headers.get('X-Request-Id') ?? crypto.randomUUID();
  try {
    const dependencies = createIdentityDependencies(platform);
    return await operation(createIdentityRequest(platform, dependencies));
  } catch (error) {
    return internalFailureResponse('identity.invitation_access', error, platform, requestId);
  }
}
