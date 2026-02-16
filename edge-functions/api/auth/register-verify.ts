import { server } from '@passwordless-id/webauthn';
import type { RegistrationJSON } from '@passwordless-id/webauthn/dist/esm/types';

import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../../platform';
import { CORS_HEADERS, signJWT, createCookie, requireEnv, resolveOrigin } from '../_auth-helpers';

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
  const day = date.getDate();
  const year = date.getFullYear();
  return `${authenticatorName} · ${month} ${day}, ${year}`;
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function handlePostRegisterVerify(platform: PlatformContext): Promise<Response> {
  try {
    const body = (await platform.request.json()) as {
      response: RegistrationJSON;
      name?: string;
      inviteToken?: string;
    };

    const clientDataJSON = JSON.parse(
      atob(body.response.response.clientDataJSON.replace(/-/g, '+').replace(/_/g, '/'))
    );
    const challenge = clientDataJSON.challenge;

    const storedChallenge = await platform.kv.get(`challenge:${challenge}`);
    if (!storedChallenge) {
      return new Response(JSON.stringify({ error: 'Invalid or expired challenge' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const { origin } = resolveOrigin(platform);

    const registrationInfo = await server.verifyRegistration(body.response, {
      challenge,
      origin,
    });

    const { credential } = registrationInfo;
    const passkeysData = await platform.kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    const newPasskey: Passkey = {
      id: credential.id,
      publicKey: credential.publicKey,
      counter: registrationInfo.authenticator.counter,
      name: body.name || formatPasskeyName(registrationInfo.authenticator.name),
      createdAt: Date.now(),
      aaguid: registrationInfo.authenticator.aaguid,
      transports: credential.transports,
      algorithm: credential.algorithm,
    };

    passkeys.push(newPasskey);
    await platform.kv.put('passkeys', JSON.stringify(passkeys));

    await platform.kv.delete(`challenge:${challenge}`);

    if (body.inviteToken) {
      await platform.kv.delete(`invite:${body.inviteToken}`);
    }

    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT(
      { sub: 'owner', iat: now, exp: now + 7 * 24 * 60 * 60 },
      requireEnv(platform, 'JWT_SECRET')
    );
    const cookie = createCookie('auth_token', token, {
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
    });

    return new Response(JSON.stringify({ verified: true }), {
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie, ...CORS_HEADERS },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error verifying registration:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostRegisterVerify(createEdgeOneContext(context));
}
