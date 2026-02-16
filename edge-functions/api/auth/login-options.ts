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

export async function handlePostLoginOptions(platform: PlatformContext): Promise<Response> {
  try {
    const passkeysData = await platform.kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    if (passkeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No passkeys registered' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const challenge = server.randomChallenge();
    const { hostname } = resolveOrigin(platform);

    const options = {
      challenge,
      rpId: hostname,
      allowCredentials: passkeys.map((pk) => ({
        id: pk.id,
        type: 'public-key' as const,
        transports: ['internal'] as AuthenticatorTransport[],
      })),
      hints: ['client-device'],
      userVerification: 'preferred' as const,
      timeout: 60000,
    };

    const challengeKey = `challenge:${challenge}`;
    await platform.kv.put(challengeKey, challenge, { expirationTtl: 300 });

    return new Response(JSON.stringify(options), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostLoginOptions(createEdgeOneContext(context));
}
