import { server } from '@passwordless-id/webauthn';

import { CORS_HEADERS, RequestContext, resolveKV, resolveOrigin } from '../_auth-helpers';

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

export async function onRequestPost(context: RequestContext): Promise<Response> {
  try {
    const kv = resolveKV(context);
    // Get stored credentials
    const passkeysData = await kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    if (passkeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No passkeys registered' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Generate challenge
    const challenge = server.randomChallenge();
    const { hostname } = resolveOrigin(context);

    const options = {
      challenge,
      rpId: hostname,
      allowCredentials: passkeys.map((pk) => ({
        id: pk.id,
        type: 'public-key' as const,
        transports: pk.transports as AuthenticatorTransport[] | undefined,
      })),
      userVerification: 'preferred' as const,
      timeout: 60000,
    };

    // Store challenge in KV with 5min expiry
    const challengeKey = `challenge:${challenge}`;
    await kv.put(challengeKey, challenge, { expirationTtl: 300 });

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
