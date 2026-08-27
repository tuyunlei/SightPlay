import { describe, expect, it } from 'vitest';

import { acceptsOrigin, type IdentityPolicy, validateIdentityPolicy } from './policy';

const policy: IdentityPolicy = {
  rpId: 'sightplay.pages.dev',
  rpName: 'SightPlay',
  allowedOrigins: [],
  allowedHttpsSubdomainSuffixes: ['sightplay.pages.dev'],
  userVerification: 'required',
  ceremonyTtlMs: 300_000,
  invitationTtlMs: 604_800_000,
  invitationAccessTtlMs: 7_776_000_000,
  sessionTtlMs: 604_800_000,
  rateLimits: {
    source: { limit: 30, windowMs: 60_000 },
    ceremony: { limit: 10, windowMs: 300_000 },
    invitation: { limit: 10, windowMs: 60_000 },
    account: { limit: 20, windowMs: 3_600_000 },
  },
};

describe('Identity origin policy', () => {
  it('admits generated Pages origins for this project without admitting the Pages apex', () => {
    expect(acceptsOrigin(policy, 'https://80827304.sightplay.pages.dev')).toBe(true);
    expect(acceptsOrigin(policy, 'https://codex-auth-fix.sightplay.pages.dev')).toBe(true);
    expect(acceptsOrigin(policy, 'https://sightplay.pages.dev')).toBe(false);
  });

  it('retains exact-origin equality for explicitly configured local runtimes', () => {
    const localPolicy = { ...policy, allowedOrigins: ['http://127.0.0.1:4174'] };
    expect(validateIdentityPolicy(localPolicy)).toEqual({ ok: true, value: localPolicy });
    expect(acceptsOrigin(localPolicy, 'http://127.0.0.1:4174')).toBe(true);
    expect(acceptsOrigin(localPolicy, 'http://127.0.0.1:4173')).toBe(false);
  });

  it('rejects insecure, foreign-project, suffix-confusion, and non-origin inputs', () => {
    expect(acceptsOrigin(policy, 'http://80827304.sightplay.pages.dev')).toBe(false);
    expect(acceptsOrigin(policy, 'https://80827304.other.pages.dev')).toBe(false);
    expect(acceptsOrigin(policy, 'https://sightplay.pages.dev.attacker.example')).toBe(false);
    expect(acceptsOrigin(policy, 'https://80827304.sightplay.pages.dev/path')).toBe(false);
  });

  it('rejects malformed origin configuration before runtime construction', () => {
    expect(
      validateIdentityPolicy({
        ...policy,
        allowedHttpsSubdomainSuffixes: ['https://sightplay.pages.dev'],
      })
    ).toEqual({ ok: false, failure: { code: 'invalidRequest', retryable: false } });
  });
});
