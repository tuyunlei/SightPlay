import { server } from '@passwordless-id/webauthn';
import type { RegistrationJSON } from '@passwordless-id/webauthn/dist/esm/types';

import { CORS_HEADERS, signJWT, createCookie, RequestContext, resolveKV, resolveEnv, resolveOrigin } from '../_auth-helpers';

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
      response: RegistrationJSON;
      name?: string;
      inviteToken?: string;
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

    const { origin } = resolveOrigin(context);

    // Verify the registration response
    const registrationInfo = await server.verifyRegistration(body.response, {
      challenge,
      origin,
    });

    // Store the credential
    const { credential } = registrationInfo;
    const passkeysData = await kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

    const newPasskey: Passkey = {
      id: credential.id,
      publicKey: credential.publicKey, // Already base64url string
      counter: registrationInfo.authenticator.counter,
      name: body.name || `Passkey ${passkeys.length + 1}`,
      createdAt: Date.now(),
      transports: credential.transports,
      algorithm: credential.algorithm,
    };

    passkeys.push(newPasskey);
    await kv.put('passkeys', JSON.stringify(passkeys));

    // Delete the used challenge
    await kv.delete(`challenge:${challenge}`);

    // Delete invite token if provided (one-time use)
    if (body.inviteToken) {
      await kv.delete(`invite:${body.inviteToken}`);
    }

    // Auto-login: issue JWT after successful registration
    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT(
      { sub: 'owner', iat: now, exp: now + 7 * 24 * 60 * 60 },
      resolveEnv(context, 'JWT_SECRET')
    );
    const cookie = createCookie('auth_token', token, {
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
    });

    return new Response(JSON.stringify({ verified: true }), {
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie, ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Error verifying registration:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
