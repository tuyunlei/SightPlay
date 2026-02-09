import { server } from '@passwordless-id/webauthn';
import type { AuthenticationJSON, CredentialInfo } from '@passwordless-id/webauthn/dist/esm/types';

import { CORS_HEADERS, signJWT, createCookie, RequestContext, resolveKV, resolveEnv } from '../_auth-helpers';

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

export async function onRequestPost(context: RequestContext): Promise<Response> {
  try {
    const kv = resolveKV(context);
    const body = (await context.request.json()) as {
      response: AuthenticationJSON;
    };

    // Decode clientDataJSON to get the challenge
    const clientDataJSON = JSON.parse(
      atob(body.response.response.clientDataJSON.replace(/-/g, '+').replace(/_/g, '/'))
    );
    const challenge = clientDataJSON.challenge;

    // Verify the challenge exists
    const storedChallenge = await kv.get(`challenge:${challenge}`);
    if (!storedChallenge) {
      return new Response(JSON.stringify({ error: 'Invalid or expired challenge' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Get stored credentials
    const passkeysData = await kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    // Find the credential that was used
    const credential = passkeys.find((pk) => pk.id === body.response.id);
    if (!credential) {
      return new Response(JSON.stringify({ error: 'Credential not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const origin = new URL(context.request.url).origin;

    // Build CredentialInfo for verification
    const credentialInfo: CredentialInfo = {
      id: credential.id,
      publicKey: credential.publicKey,
      algorithm: (credential.algorithm as 'ES256' | 'RS256' | 'EdDSA') || 'ES256',
      transports: (credential.transports || []) as CredentialInfo['transports'],
    };

    // Verify the authentication response
    const authInfo = await server.verifyAuthentication(body.response, credentialInfo, {
      challenge,
      origin,
      userVerified: false,
      counter: credential.counter,
    });

    // Update counter
    const updatedPasskeys = passkeys.map((pk) =>
      pk.id === credential.id ? { ...pk, counter: authInfo.counter } : pk
    );
    await kv.put('passkeys', JSON.stringify(updatedPasskeys));

    // Delete the used challenge
    await kv.delete(`challenge:${challenge}`);

    // Create JWT token (7 day expiry)
    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT(
      {
        sub: 'owner',
        iat: now,
        exp: now + 7 * 24 * 60 * 60,
      },
      resolveEnv(context, 'JWT_SECRET')
    );

    // Set cookie
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
