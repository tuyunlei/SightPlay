import { server } from '@passwordless-id/webauthn';

import { CORS_HEADERS, RequestContext, resolveKV } from '../_auth-helpers';

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
    // Get existing passkeys
    const passkeysData = await kv.get('passkeys');
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
      const inviteData = await kv.get(inviteKey);

      if (!inviteData) {
        return new Response(JSON.stringify({ error: 'Invalid or expired invite token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
      // Do NOT delete the token yet - delete after successful verification
    }

    // Generate challenge
    const challenge = server.randomChallenge();
    const hostname = new URL(context.request.url).hostname;

    // Build PublicKeyCredentialCreationOptions manually
    const userIdBytes = new TextEncoder().encode('owner');
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
        name: 'owner',
        displayName: 'Owner',
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
        residentKey: 'preferred' as const,
        userVerification: 'preferred' as const,
      },
      timeout: 60000,
    };

    // Store challenge in KV with 5min expiry
    const challengeKey = `challenge:${challenge}`;
    await kv.put(challengeKey, challenge, { expirationTtl: 300 });

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
