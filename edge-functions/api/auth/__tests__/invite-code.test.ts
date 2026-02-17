import { describe, expect, it } from 'vitest';

import {
  consumeInviteValidationRateLimit,
  createInviteCode,
  createInviteRecord,
  inviteKey,
  isInviteCodeFormatValid,
  isInviteRecordExpired,
  normalizeInviteCode,
  parseInviteRecord,
} from '../invite-code';

class FakeKV {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('invite-code utils', () => {
  it('generates code with expected format and charset', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = createInviteCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      expect(isInviteCodeFormatValid(code)).toBe(true);
    }
  });

  it('generates mostly unique codes', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => createInviteCode()));
    expect(codes.size).toBeGreaterThan(990);
  });

  it('normalizes input case-insensitively', () => {
    expect(normalizeInviteCode('ab-cd-efgh')).toBe('ABCDEFGH');
    expect(inviteKey('abCD-efgh')).toBe('invite:ABCDEFGH');
  });

  it('parses and validates invite status (valid/expired/used/invalid)', () => {
    const now = Date.now();
    const validRecord = createInviteRecord('u1', now);
    expect(isInviteRecordExpired(validRecord, now + 1000)).toBe(false);

    const expired = { ...validRecord, expiresAt: now - 1 };
    expect(isInviteRecordExpired(expired, now)).toBe(true);

    const used = { ...validRecord, usedBy: 'u2', usedAt: now };
    expect(used.usedBy).toBeTruthy();

    expect(parseInviteRecord('invalid-json')).toBeNull();
    expect(parseInviteRecord(null)).toBeNull();
  });

  it('blocks after more than 10 attempts in 10 seconds and keeps 1 hour ban', async () => {
    const kv = new FakeKV();
    const now = 1_700_000_000_000;

    for (let i = 0; i < 10; i += 1) {
      await expect(consumeInviteValidationRateLimit(kv, '1.1.1.1', now + i)).resolves.toEqual({
        blocked: false,
      });
    }

    const banned = await consumeInviteValidationRateLimit(kv, '1.1.1.1', now + 9);
    expect(banned.blocked).toBe(true);
    expect(banned.retryAfterSeconds).toBe(3600);

    const stillBanned = await consumeInviteValidationRateLimit(kv, '1.1.1.1', now + 15_000);
    expect(stillBanned.blocked).toBe(true);
    expect(stillBanned.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets window after 10 seconds', async () => {
    const kv = new FakeKV();
    const now = 2_000_000;

    for (let i = 0; i < 10; i += 1) {
      await consumeInviteValidationRateLimit(kv, '2.2.2.2', now + i * 100);
    }

    const afterWindow = await consumeInviteValidationRateLimit(kv, '2.2.2.2', now + 11_000);
    expect(afterWindow.blocked).toBe(false);
  });
});
