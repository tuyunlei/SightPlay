import { server } from '@passwordless-id/webauthn';
import type { AuthenticationJSON, CredentialInfo } from '@passwordless-id/webauthn/dist/esm/types';

import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../../platform';
import { createRequestContext, logBreadcrumb, logError } from '../../utils/logger';
import { CORS_HEADERS, signJWT, createCookie, requireEnv, resolveOrigin } from '../_auth-helpers';

interface Passkey {
  id: string;
  publicKey: string;
  counter: number;
  name: string;
  createdAt: number;
  transports?: string[];
  algorithm?: string;
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

export async function handlePostLoginVerify(platform: PlatformContext): Promise<Response> {
  const requestContext = createRequestContext(platform.request);

  try {
    logBreadcrumb('auth.login.start', requestContext);
    const body = (await platform.request.json()) as {
      response: AuthenticationJSON;
    };

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

    const passkeysData = await platform.kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    const credential = passkeys.find((pk) => pk.id === body.response.id);
    if (!credential) {
      return jsonResponse(
        { error: 'Credential not found', requestId: requestContext.requestId },
        400
      );
    }

    const { origin } = resolveOrigin(platform);

    const credentialInfo: CredentialInfo = {
      id: credential.id,
      publicKey: credential.publicKey,
      algorithm: (credential.algorithm as 'ES256' | 'RS256' | 'EdDSA') || 'ES256',
      transports: (credential.transports || []) as CredentialInfo['transports'],
    };

    const authInfo = await server.verifyAuthentication(body.response, credentialInfo, {
      challenge,
      origin,
      userVerified: false,
      counter: credential.counter,
    });

    const updatedPasskeys = passkeys.map((pk) =>
      pk.id === credential.id ? { ...pk, counter: authInfo.counter } : pk
    );
    await platform.kv.put('passkeys', JSON.stringify(updatedPasskeys));

    await platform.kv.delete(`challenge:${challenge}`);

    const cookie = await issueAuthCookie(platform);

    logBreadcrumb('auth.login.success', requestContext, { credentialId: credential.id });

    return jsonResponse({ verified: true }, 200, { 'Set-Cookie': cookie });
  } catch (error) {
    logBreadcrumb('auth.login.failure', requestContext);
    logError('auth.login-verify', error, requestContext);
    return jsonResponse(
      { error: 'Internal server error', requestId: requestContext.requestId },
      500
    );
  }
}

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostLoginVerify(createEdgeOneContext(context));
}
