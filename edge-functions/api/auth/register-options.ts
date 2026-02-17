import { server } from '@passwordless-id/webauthn';

import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../../platform';
import { CORS_HEADERS, resolveOrigin } from '../_auth-helpers';

import {
  consumeInviteValidationRateLimit,
  getClientIp,
  inviteKey,
  isInviteCodeFormatValid,
  isInviteRecordExpired,
  parseInviteRecord,
  toDisplayInviteCode,
} from './invite-code';

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

function unauthorized(error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export async function handlePostRegisterOptions(platform: PlatformContext): Promise<Response> {
  try {
    const body = (await platform.request.json().catch(() => ({}))) as { inviteCode?: string };
    if (!body.inviteCode || !isInviteCodeFormatValid(body.inviteCode)) {
      return unauthorized('Invite code is invalid');
    }

    const ip = getClientIp(platform.request);
    const rate = await consumeInviteValidationRateLimit(platform.kv, ip);
    if (rate.blocked) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rate.retryAfterSeconds ?? 3600),
          ...CORS_HEADERS,
        },
      });
    }

    const normalizedCode = toDisplayInviteCode(body.inviteCode);
    const invite = parseInviteRecord(await platform.kv.get(inviteKey(normalizedCode)));

    if (!invite) return unauthorized('Invite code is invalid');
    if (invite.usedBy) return unauthorized('Invite code has already been used');
    if (isInviteRecordExpired(invite)) return unauthorized('Invite code has expired');

    const passkeysData = await platform.kv.get('passkeys');
    const passkeys: Passkey[] = passkeysData ? JSON.parse(passkeysData) : [];

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

    await platform.kv.put(`challenge:${challenge}`, challenge, { expirationTtl: 300 });

    return new Response(JSON.stringify(options), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Error generating registration options:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: 'Internal server error', detail }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostRegisterOptions(createEdgeOneContext(context));
}
