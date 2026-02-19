import type { KVStore } from '../../platform';

const INVITE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_RAW_LENGTH = 8;
const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;
const INVITE_RATE_WINDOW_SECONDS = 60; // CF KV minimum expirationTtl is 60s
const INVITE_RATE_LIMIT = 10;
const INVITE_BAN_SECONDS = 60 * 60;

export interface InviteRecord {
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  usedBy?: string;
  usedAt?: number;
}

interface InviteRateLimitRecord {
  count: number;
  windowStart: number;
  bannedUntil?: number;
}

export function normalizeInviteCode(input: string): string {
  return input.replace(/-/g, '').trim().toUpperCase();
}

export function isInviteCodeFormatValid(input: string): boolean {
  const normalized = normalizeInviteCode(input);
  if (normalized.length !== INVITE_RAW_LENGTH) return false;
  return [...normalized].every((char) => INVITE_CHARSET.includes(char));
}

export function toDisplayInviteCode(input: string): string {
  const normalized = normalizeInviteCode(input);
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

export function createInviteCode(): string {
  const chars = new Array(INVITE_RAW_LENGTH).fill('');
  const bytes = new Uint8Array(INVITE_RAW_LENGTH);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < INVITE_RAW_LENGTH; i += 1) {
    chars[i] = INVITE_CHARSET[bytes[i] % INVITE_CHARSET.length];
  }
  return toDisplayInviteCode(chars.join(''));
}

export function inviteKey(code: string): string {
  return `invite:${normalizeInviteCode(code)}`;
}

export function createInviteRecord(createdBy: string, now = Date.now()): InviteRecord {
  return {
    createdBy,
    createdAt: now,
    expiresAt: now + INVITE_TTL_SECONDS * 1000,
  };
}

export function isInviteRecordExpired(record: InviteRecord, now = Date.now()): boolean {
  return record.expiresAt <= now;
}

export function parseInviteRecord(raw: string | null): InviteRecord | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InviteRecord;
  } catch {
    return null;
  }
}

export async function consumeInviteValidationRateLimit(
  kv: KVStore,
  ip: string,
  now = Date.now()
): Promise<{ blocked: boolean; retryAfterSeconds?: number }> {
  const key = `ratelimit:invite:${ip}`;
  const record = parseRateLimitRecord(await kv.get(key));

  if (record?.bannedUntil && record.bannedUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((record.bannedUntil - now) / 1000),
    };
  }

  const current: InviteRateLimitRecord =
    !record || now - record.windowStart > INVITE_RATE_WINDOW_SECONDS * 1000
      ? { count: 1, windowStart: now }
      : { ...record, count: record.count + 1 };

  if (current.count > INVITE_RATE_LIMIT) {
    const bannedUntil = now + INVITE_BAN_SECONDS * 1000;
    await kv.put(key, JSON.stringify({ ...current, bannedUntil }), {
      expirationTtl: INVITE_BAN_SECONDS,
    });
    return { blocked: true, retryAfterSeconds: INVITE_BAN_SECONDS };
  }

  await kv.put(key, JSON.stringify(current), { expirationTtl: INVITE_RATE_WINDOW_SECONDS });
  return { blocked: false };
}

function parseRateLimitRecord(raw: string | null): InviteRateLimitRecord | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InviteRateLimitRecord;
  } catch {
    return null;
  }
}

export function getInviteTtlSeconds(): number {
  return INVITE_TTL_SECONDS;
}

export function getClientIp(request: Request): string {
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp;
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}
