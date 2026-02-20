import { server } from '@passwordless-id/webauthn';

import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../../platform';
import { createRequestContext, logBreadcrumb, logError } from '../../utils/logger';
import { CORS_HEADERS, resolveOrigin } from '../_auth-helpers';

import {
  consumeInviteValidationRateLimit,
  getClientIp,
  inviteKey,
  isInviteCodeFormatValid,
  isInviteRecordExpired,
  parseInviteRecord,
  toDisplayInviteCode,
} from './invite-code';

interface Passkey {
  id: string;
  publicKey: string;
  counter: number;
  name: string;
  createdAt: number;
  transports?: string[];
}

function jsonResponse(body: object, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...headers },
  });
}

function createUserIdBase64(): string {
  const userIdBytes = new TextEncoder().encode('sightplay-user');
  return btoa(String.fromCharCode(...userIdBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

function unauthorized(error: string, requestId: string): Response {
  return jsonResponse({ error, requestId }, 401);
}

export async function handlePostRegisterOptions(platform: PlatformContext): Promise<Response> {
  const requestContext = createRequestContext(platform.request);

  try {
    logBreadcrumb('auth.registration.start', requestContext);
    const body = (await platform.request.json().catch(() => ({}))) as { inviteCode?: string };
    if (!body.inviteCode || !isInviteCodeFormatValid(body.inviteCode)) {
      return unauthorized('Invite code is invalid', requestContext.requestId);
    }

    const ip = getClientIp(platform.request);
    const rate = await consumeInviteValidationRateLimit(platform.kv, ip);
    if (rate.blocked) {
      return jsonResponse(
        { error: 'Too many requests', requestId: requestContext.requestId },
        429,
        { 'Retry-After': String(rate.retryAfterSeconds ?? 3600) }
      );
    }

    const normalizedCode = toDisplayInviteCode(body.inviteCode);
    const invite = parseInviteRecord(await platform.kv.get(inviteKey(normalizedCode)));

    if (!invite) return unauthorized('Invite code is invalid', requestContext.requestId);
    if (invite.usedBy)
      return unauthorized('Invite code has already been used', requestContext.requestId);
    if (isInviteRecordExpired(invite))
      return unauthorized('Invite code has expired', requestContext.requestId);

    const passkeysData = await platform.kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    const challenge = server.randomChallenge();
    const { hostname } = resolveOrigin(platform);

    const userIdBase64 = createUserIdBase64();

    const options = {
      challenge,
      rp: {
        name: 'SightPlay',
        id: hostname,
      },
      user: {
        id: userIdBase64,
        name: 'SightPlay User',
        displayName: 'SightPlay User',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' as const },
        { alg: -257, type: 'public-key' as const },
      ],
      excludeCredentials: passkeys.map((pk) => ({
        id: pk.id,
        type: 'public-key' as const,
        transports: pk.transports as AuthenticatorTransport[] | undefined,
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform' as const,
        residentKey: 'preferred' as const,
        userVerification: 'preferred' as const,
      },
      timeout: 60000,
    };

    await platform.kv.put(`challenge:${challenge}`, challenge, { expirationTtl: 300 });

    logBreadcrumb('auth.registration.success', requestContext);

    return jsonResponse(options);
  } catch (error) {
    logBreadcrumb('auth.registration.failure', requestContext);
    logError('auth.register-options', error, requestContext);
    return jsonResponse(
      { error: 'Internal server error', requestId: requestContext.requestId },
      500
    );
  }
}

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostRegisterOptions(createEdgeOneContext(context));
}
