import { server } from '@passwordless-id/webauthn';
import type { RegistrationJSON } from '@passwordless-id/webauthn/dist/esm/types';

import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../../platform';
import { createRequestContext, logBreadcrumb, logError } from '../../utils/logger';
import { CORS_HEADERS, signJWT, createCookie, requireEnv, resolveOrigin } from '../_auth-helpers';

import {
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
  algorithm?: string;
  aaguid?: string;
}

function formatPasskeyName(authenticatorName: string): string {
  const date = new Date();
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${authenticatorName} · ${month} ${date.getDate()}, ${date.getFullYear()}`;
}

function jsonResponse(body: object, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...headers },
  });
}

async function issueAuthCookie(platform: PlatformContext): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const token = await signJWT(
    { sub: 'owner', iat: now, exp: now + 7 * 24 * 60 * 60 },
    requireEnv(platform, 'JWT_SECRET')
  );

  return createCookie('auth_token', token, {
    maxAge: 7 * 24 * 60 * 60,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
  });
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

function unauthorized(error: string, requestId: string): Response {
  return jsonResponse({ error, requestId }, 401);
}

export async function handlePostRegisterVerify(platform: PlatformContext): Promise<Response> {
  const requestContext = createRequestContext(platform.request);

  try {
    logBreadcrumb('auth.registration.start', requestContext);
    const body = (await platform.request.json()) as {
      response: RegistrationJSON;
      name?: string;
      inviteCode?: string;
    };

    if (!body.inviteCode || !isInviteCodeFormatValid(body.inviteCode)) {
      return unauthorized('Invite code is invalid', requestContext.requestId);
    }

    const normalizedCode = toDisplayInviteCode(body.inviteCode);
    const inviteStorageKey = inviteKey(normalizedCode);
    const invite = parseInviteRecord(await platform.kv.get(inviteStorageKey));

    if (!invite) return unauthorized('Invite code is invalid', requestContext.requestId);
    if (invite.usedBy)
      return unauthorized('Invite code has already been used', requestContext.requestId);
    if (isInviteRecordExpired(invite))
      return unauthorized('Invite code has expired', requestContext.requestId);

    const clientDataJSON = JSON.parse(
      atob(body.response.response.clientDataJSON.replace(/-/g, '+').replace(/_/g, '/'))
    );
    const challenge = clientDataJSON.challenge;

    const storedChallenge = await platform.kv.get(`challenge:${challenge}`);
    if (!storedChallenge) {
      return jsonResponse(
        { error: 'Invalid or expired challenge', requestId: requestContext.requestId },
        400
      );
    }

    const { origin } = resolveOrigin(platform);
    const registrationInfo = await server.verifyRegistration(body.response, { challenge, origin });

    const { credential } = registrationInfo;
    const passkeysData = await platform.kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    passkeys.push({
      id: credential.id,
      publicKey: credential.publicKey,
      counter: registrationInfo.authenticator.counter,
      name: body.name || formatPasskeyName(registrationInfo.authenticator.name),
      createdAt: Date.now(),
      aaguid: registrationInfo.authenticator.aaguid,
      transports: credential.transports,
      algorithm: credential.algorithm,
    });

    await platform.kv.put('passkeys', JSON.stringify(passkeys));
    await platform.kv.delete(`challenge:${challenge}`);

    const usedAt = Date.now();
    await platform.kv.put(
      inviteStorageKey,
      JSON.stringify({ ...invite, usedBy: credential.id, usedAt }),
      { expirationTtl: Math.max(1, Math.ceil((invite.expiresAt - usedAt) / 1000)) }
    );

    const cookie = await issueAuthCookie(platform);

    logBreadcrumb('auth.registration.success', requestContext, { credentialId: credential.id });

    return jsonResponse({ verified: true }, 200, { 'Set-Cookie': cookie });
  } catch (error) {
    logBreadcrumb('auth.registration.failure', requestContext);
    logError('auth.register-verify', error, requestContext);
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message, requestId: requestContext.requestId }, 500);
  }
}

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostRegisterVerify(createEdgeOneContext(context));
}
