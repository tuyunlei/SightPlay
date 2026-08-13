import { createInvitations, validateInvitation } from '@sightplay/identity-server';

import type { PlatformContext } from '../../platform';

import {
  authenticateIdentityRequest,
  createIdentityRequest,
  failureResponse,
  internalFailureResponse,
  invalidRequestResponse,
  onRequestOptions,
  readUnknownJson,
  resultResponse,
} from './identity-http';
import { createIdentityDependencies } from './identity-runtime';

export { onRequestOptions };

export async function handlePostInvite(platform: PlatformContext): Promise<Response> {
  return handleInvite(platform, async (request) => {
    const session = await authenticateIdentityRequest(request, true);
    if (!session.ok) return resultResponse(session, request.requestId);
    const count = decodeCount(await readUnknownJson(platform.request));
    if (count === null) return invalidRequestResponse(request.requestId);
    const result = await createInvitations(
      { issuerAccountId: session.value.accountId, count },
      request.dependencies
    );
    return resultResponse(
      result.ok ? { ok: true, value: { codes: result.value } } : result,
      request.requestId
    );
  });
}

export async function handlePostInviteAdmin(platform: PlatformContext): Promise<Response> {
  return handleInvite(platform, async (request) => {
    const expected = platform.env('ADMIN_SECRET');
    const actual = platform.request.headers.get('X-Admin-Secret');
    if (!expected || !actual || !timingSafeEqual(actual, expected)) {
      return failureResponse(
        { code: 'authenticationRequired', retryable: false },
        request.requestId
      );
    }
    const count = decodeCount(await readUnknownJson(platform.request));
    if (count === null) return invalidRequestResponse(request.requestId);
    const result = await createInvitations({ issuerAccountId: null, count }, request.dependencies);
    return resultResponse(
      result.ok ? { ok: true, value: { codes: result.value } } : result,
      request.requestId
    );
  });
}

export async function handleGetInviteByCode(platform: PlatformContext): Promise<Response> {
  return handleInvite(platform, async (request) => {
    const rawCode = new URL(platform.request.url).pathname.split('/').filter(Boolean).at(-1);
    if (!rawCode) return invalidRequestResponse(request.requestId);
    const result = await validateInvitation(
      { code: rawCode, source: request.source },
      request.dependencies
    );
    return resultResponse(
      result.ok
        ? { ok: true, value: { valid: true as const, expiresAt: result.value.expiresAt } }
        : result,
      request.requestId
    );
  });
}

function decodeCount(value: unknown): number | null {
  if (value === null) return 1;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  const count = (value as Record<string, unknown>).count ?? 1;
  return Number.isInteger(count) && Number(count) >= 1 && Number(count) <= 10
    ? Number(count)
    : null;
}

function timingSafeEqual(first: string, second: string): boolean {
  if (first.length !== second.length) return false;
  const firstBytes = new TextEncoder().encode(first);
  const secondBytes = new TextEncoder().encode(second);
  let difference = 0;
  for (let index = 0; index < firstBytes.length; index += 1) {
    difference |= firstBytes[index] ^ secondBytes[index];
  }
  return difference === 0;
}

async function handleInvite(
  platform: PlatformContext,
  operation: (request: ReturnType<typeof createIdentityRequest>) => Promise<Response>
): Promise<Response> {
  const requestId = platform.request.headers.get('X-Request-Id') ?? crypto.randomUUID();
  try {
    const dependencies = createIdentityDependencies(platform);
    return await operation(createIdentityRequest(platform, dependencies));
  } catch (error) {
    return internalFailureResponse('identity.invitation', error, platform, requestId);
  }
}
