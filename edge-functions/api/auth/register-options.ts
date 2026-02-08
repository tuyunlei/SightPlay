import { generateRegistrationOptions } from '@simplewebauthn/server';

import { CORS_HEADERS, getAuthenticatedUser } from '../_auth-helpers';

interface RequestContext {
  request: Request;
  env: { KV: KVNamespace; JWT_SECRET: string; GEMINI_API_KEY: string };
}

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
    // Get existing passkeys
    const passkeysData = await context.env.KV.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    // If passkeys exist, require authentication
    if (passkeys.length > 0) {
      const user = await getAuthenticatedUser(context.request, context.env.JWT_SECRET);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    }

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: 'SightPlay',
      rpID: new URL(context.request.url).hostname,
      userName: 'owner',
      userDisplayName: 'Owner',
      // Exclude existing credentials
      excludeCredentials: passkeys.map((pk) => ({
        id: pk.id,
        type: 'public-key',
        transports: pk.transports as AuthenticatorTransport[] | undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store challenge in KV with 5min expiry
    const challengeKey = `challenge:${options.challenge}`;
    await context.env.KV.put(challengeKey, options.challenge, { expirationTtl: 300 });

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
