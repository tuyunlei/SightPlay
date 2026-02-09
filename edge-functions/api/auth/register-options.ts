import { generateRegistrationOptions } from '@simplewebauthn/server';

import { CORS_HEADERS } from '../_auth-helpers';

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

    // If passkeys exist, require valid invite token
    if (passkeys.length > 0) {
      const body = (await context.request.json()) as { inviteToken?: string };

      if (!body.inviteToken) {
        return new Response(JSON.stringify({ error: 'Invite token required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      // Verify invite token exists in KV
      const inviteKey = `invite:${body.inviteToken}`;
      const inviteData = await context.env.KV.get(inviteKey);

      if (!inviteData) {
        return new Response(JSON.stringify({ error: 'Invalid or expired invite token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
      // Do NOT delete the token yet - delete after successful verification
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
