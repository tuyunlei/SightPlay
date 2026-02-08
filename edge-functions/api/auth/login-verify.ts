import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';

import { CORS_HEADERS, signJWT, createCookie } from '../_auth-helpers';

// Helper to convert base64url to Uint8Array
function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

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
    const body = (await context.request.json()) as {
      response: AuthenticationResponseJSON;
    };

    // Decode clientDataJSON to get the challenge
    const clientDataJSON = JSON.parse(
      atob(body.response.response.clientDataJSON.replace(/-/g, '+').replace(/_/g, '/'))
    );
    const challenge = clientDataJSON.challenge;

    // Verify the challenge exists
    const storedChallenge = await context.env.KV.get(`challenge:${challenge}`);
    if (!storedChallenge) {
      return new Response(JSON.stringify({ error: 'Invalid or expired challenge' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Get stored credentials
    const passkeysData = await context.env.KV.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    // Find the credential that was used
    const credential = passkeys.find((pk) => pk.id === body.response.id);
    if (!credential) {
      return new Response(JSON.stringify({ error: 'Credential not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Verify the authentication response
    // ID is kept as base64url string, publicKey is converted to Uint8Array
    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: new URL(context.request.url).origin,
      expectedRPID: new URL(context.request.url).hostname,
      credential: {
        id: credential.id,  // Already base64url string
        publicKey: base64urlToUint8Array(credential.publicKey),
        counter: credential.counter,
      },
    });

    if (!verification.verified) {
      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Update counter
    const updatedPasskeys = passkeys.map((pk) =>
      pk.id === credential.id
        ? { ...pk, counter: verification.authenticationInfo.newCounter }
        : pk
    );
    await context.env.KV.put('passkeys', JSON.stringify(updatedPasskeys));

    // Delete the used challenge
    await context.env.KV.delete(`challenge:${challenge}`);

    // Create JWT token (7 day expiry)
    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT(
      {
        sub: 'owner',
        iat: now,
        exp: now + 7 * 24 * 60 * 60, // 7 days
      },
      context.env.JWT_SECRET
    );

    // Set cookie
    const cookie = createCookie('auth_token', token, {
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
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
