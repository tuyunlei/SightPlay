import { server } from '@passwordless-id/webauthn';
import type { AuthenticationJSON, CredentialInfo } from '@passwordless-id/webauthn/dist/esm/types';

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
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function handlePostLoginVerify(platform: PlatformContext): Promise<Response> {
  try {
    const body = (await platform.request.json()) as {
      response: AuthenticationJSON;
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

    const passkeysData = await platform.kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    const credential = passkeys.find((pk) => pk.id === body.response.id);
    if (!credential) {
      return new Response(JSON.stringify({ error: 'Credential not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
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

    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT(
      {
        sub: 'owner',
        iat: now,
        exp: now + 7 * 24 * 60 * 60,
      },
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
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
        ...CORS_HEADERS,
      },
    });
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostLoginVerify(createEdgeOneContext(context));
}
