import {
  createEdgeOneContext,
  type EdgeOneRequestContext,
  type PlatformContext,
} from '../../platform';
import { createRequestContext, logBreadcrumb, logError } from '../../utils/logger';
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
  const requestContext = createRequestContext(platform.request);

  try {
    logBreadcrumb('invite.generation.start', requestContext, { source: 'user' });
    const user = await getAuthenticatedUser(platform.request, requireEnv(platform, 'JWT_SECRET'));
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', requestId: requestContext.requestId }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    const body = (await platform.request.json().catch(() => ({}))) as InviteCountBody;
    const codes = await generateInviteCodes(platform, user, getCount(body));
    logBreadcrumb('invite.generation.success', requestContext, {
      source: 'user',
      count: codes.length,
    });

    return new Response(JSON.stringify({ codes }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    logBreadcrumb('invite.generation.failure', requestContext, { source: 'user' });
    logError('auth.invite.generate', error, requestContext);
    return new Response(
      JSON.stringify({ error: 'Internal server error', requestId: requestContext.requestId }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
}

export async function handlePostInviteAdmin(platform: PlatformContext): Promise<Response> {
  const requestContext = createRequestContext(platform.request);

  try {
    logBreadcrumb('invite.generation.start', requestContext, { source: 'admin' });
    const adminSecret = platform.env('ADMIN_SECRET');
    const provided = platform.request.headers.get('X-Admin-Secret');
    if (!adminSecret || !provided || !timingSafeEqual(provided, adminSecret)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', requestId: requestContext.requestId }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    const body = (await platform.request.json().catch(() => ({}))) as InviteCountBody;
    const codes = await generateInviteCodes(platform, 'admin', getCount(body));
    logBreadcrumb('invite.generation.success', requestContext, {
      source: 'admin',
      count: codes.length,
    });

    return new Response(JSON.stringify({ codes }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    logBreadcrumb('invite.generation.failure', requestContext, { source: 'admin' });
    logError('auth.invite.generate-admin', error, requestContext);
    return new Response(
      JSON.stringify({ error: 'Internal server error', requestId: requestContext.requestId }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
}

function getInviteCodeFromPath(request: Request): string | null {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  return segments.at(-1) ?? null;
}

export async function handleGetInviteByCode(platform: PlatformContext): Promise<Response> {
  const requestContext = createRequestContext(platform.request);

  try {
    logBreadcrumb('invite.validation.start', requestContext);
    const ip = getClientIp(platform.request);
    const rate = await consumeInviteValidationRateLimit(platform.kv, ip);
    if (rate.blocked) {
      return new Response(
        JSON.stringify({ error: 'Too many requests', requestId: requestContext.requestId }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rate.retryAfterSeconds ?? 3600),
            ...CORS_HEADERS,
          },
        }
      );
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
      logBreadcrumb('invite.validation.failure', requestContext, { reason: 'invalid' });
      return new Response(JSON.stringify({ valid: false, reason: 'invalid' }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
    if (record.usedBy) {
      logBreadcrumb('invite.validation.failure', requestContext, { reason: 'used' });
      return new Response(JSON.stringify({ valid: false, reason: 'used' }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
    if (isInviteRecordExpired(record)) {
      logBreadcrumb('invite.validation.failure', requestContext, { reason: 'expired' });
      return new Response(JSON.stringify({ valid: false, reason: 'expired' }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    logBreadcrumb('invite.validation.success', requestContext, { expiresAt: record.expiresAt });

    return new Response(JSON.stringify({ valid: true, expiresAt: record.expiresAt }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error) {
    logBreadcrumb('invite.validation.failure', requestContext, { reason: 'unexpected_error' });
    logError('auth.invite.validate', error, requestContext);
    return new Response(
      JSON.stringify({ error: 'Internal server error', requestId: requestContext.requestId }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
}

export async function onRequestPost(context: EdgeOneRequestContext): Promise<Response> {
  return handlePostInvite(createEdgeOneContext(context));
}
