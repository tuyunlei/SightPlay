import { server } from '@passwordless-id/webauthn';

import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../../platform';
import { CORS_HEADERS, resolveOrigin } from '../_auth-helpers';

interface Passkey {
  id: string;
  publicKey: string;
  counter: number;
  name: string;
  createdAt: number;
  transports?: string[];
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function handlePostRegisterOptions(platform: PlatformContext): Promise<Response> {
  try {
    const passkeysData = await platform.kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    if (passkeys.length > 0) {
      const body = (await platform.request.json()) as { inviteToken?: string };

      if (!body.inviteToken) {
        return new Response(JSON.stringify({ error: 'Invite token required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      const inviteKey = `invite:${body.inviteToken}`;
      const inviteData = await platform.kv.get(inviteKey);

      if (!inviteData) {
        return new Response(JSON.stringify({ error: 'Invalid or expired invite token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    }

    const challenge = server.randomChallenge();
    const { hostname } = resolveOrigin(platform);

    const userIdBytes = new TextEncoder().encode('sightplay-user');
    const userIdBase64 = btoa(String.fromCharCode(...userIdBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

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

    const challengeKey = `challenge:${challenge}`;
    await platform.kv.put(challengeKey, challenge, { expirationTtl: 300 });

    return new Response(JSON.stringify(options), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Error generating registration options:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostRegisterOptions(createEdgeOneContext(context));
}
