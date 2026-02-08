import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

import { CORS_HEADERS } from '../_auth-helpers';

// Helper to convert Uint8Array to base64url
function uint8ArrayToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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
      response: RegistrationResponseJSON;
      name?: string;
    };

    // Verify the challenge exists
    // Decode base64url clientDataJSON to get the actual challenge
    const clientDataJSON = JSON.parse(
      atob(body.response.response.clientDataJSON.replace(/-/g, '+').replace(/_/g, '/'))
    );
    const challenge = clientDataJSON.challenge;

    const storedChallenge = await context.env.KV.get(`challenge:${challenge}`);
    if (!storedChallenge) {
      return new Response(JSON.stringify({ error: 'Invalid or expired challenge' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: new URL(context.request.url).origin,
      expectedRPID: new URL(context.request.url).hostname,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Store the credential
    const { credential } = verification.registrationInfo;
    const passkeysData = await context.env.KV.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    // credential.id is already a base64url string
    // credential.publicKey is Uint8Array, convert it to base64url string for storage
    const publicKeyBase64 = uint8ArrayToBase64url(credential.publicKey);

    const newPasskey: Passkey = {
      id: credential.id,  // Already base64url string
      publicKey: publicKeyBase64,
      counter: credential.counter,
      name: body.name || `Passkey ${passkeys.length + 1}`,
      createdAt: Date.now(),
      transports: body.response.response.transports,
    };

    passkeys.push(newPasskey);
    await context.env.KV.put('passkeys', JSON.stringify(passkeys));

    // Delete the used challenge
    await context.env.KV.delete(`challenge:${challenge}`);

    return new Response(JSON.stringify({ verified: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Error verifying registration:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
