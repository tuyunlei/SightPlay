import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../../platform';
import { CORS_HEADERS, getAuthenticatedUser, requireEnv, timingSafeEqual } from '../_auth-helpers';

import {
  consumeInviteValidationRateLimit,
  createInviteCode,
  createInviteRecord,
  getClientIp,
  getInviteTtlSeconds,
  inviteKey,
  isInviteCodeFormatValid,
  isInviteRecordExpired,
  parseInviteRecord,
  toDisplayInviteCode,
} from './invite-code';

interface InviteCountBody {
  count?: number;
}

function getCount(body: InviteCountBody): number {
  const count = body.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > 10) return 1;
  return count;
}

async function generateInviteCodes(
  platform: PlatformContext,
  createdBy: string,
  count: number
): Promise<string[]> {
  const codes = new Set<string>();
  while (codes.size < count) {
    const code = createInviteCode();
    if (codes.has(code)) continue;
    const key = inviteKey(code);
    const existing = await platform.kv.get(key);
    if (existing) continue;
    await platform.kv.put(key, JSON.stringify(createInviteRecord(createdBy)), {
      expirationTtl: getInviteTtlSeconds(),
    });
    codes.add(code);
  }
  return [...codes];
}

export function onRequestOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function handlePostInvite(platform: PlatformContext): Promise<Response> {
  try {
    const user = await getAuthenticatedUser(platform.request, requireEnv(platform, 'JWT_SECRET'));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const body = (await platform.request.json().catch(() => ({}))) as InviteCountBody;
    const codes = await generateInviteCodes(platform, user, getCount(body));
    return new Response(JSON.stringify({ codes }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Error generating invite codes:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

export async function handlePostInviteAdmin(platform: PlatformContext): Promise<Response> {
  try {
    const adminSecret = platform.env('ADMIN_SECRET');
    const provided = platform.request.headers.get('X-Admin-Secret');
    if (!adminSecret || !provided || !timingSafeEqual(provided, adminSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const body = (await platform.request.json().catch(() => ({}))) as InviteCountBody;
    const codes = await generateInviteCodes(platform, 'admin', getCount(body));
    return new Response(JSON.stringify({ codes }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Error generating admin invite codes:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

function getInviteCodeFromPath(request: Request): string | null {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  return segments.at(-1) ?? null;
}

export async function handleGetInviteByCode(platform: PlatformContext): Promise<Response> {
  try {
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

    const rawCode = getInviteCodeFromPath(platform.request);
    if (!rawCode || !isInviteCodeFormatValid(rawCode)) {
      return new Response(JSON.stringify({ valid: false, reason: 'invalid' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const normalized = toDisplayInviteCode(rawCode);
    const record = parseInviteRecord(await platform.kv.get(inviteKey(normalized)));
    if (!record) {
      return new Response(JSON.stringify({ valid: false, reason: 'invalid' }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
    if (record.usedBy) {
      return new Response(JSON.stringify({ valid: false, reason: 'used' }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
    if (isInviteRecordExpired(record)) {
      return new Response(JSON.stringify({ valid: false, reason: 'expired' }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    return new Response(JSON.stringify({ valid: true, expiresAt: record.expiresAt }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    console.error('Error validating invite code:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostInvite(createEdgeOneContext(context));
}
