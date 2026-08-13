import type { IdentityRateLimitScope } from '../ports';

import { failed, type IdentityServerResult } from './failure';

export interface IdentityRateLimitPolicy {
  readonly limit: number;
  readonly windowMs: number;
}

export interface IdentityPolicy {
  readonly rpId: string;
  readonly rpName: string;
  readonly allowedOrigins: readonly string[];
  readonly userVerification: 'required' | 'preferred';
  readonly ceremonyTtlMs: number;
  readonly invitationTtlMs: number;
  readonly sessionTtlMs: number;
  readonly rateLimits: Readonly<Record<IdentityRateLimitScope, IdentityRateLimitPolicy>>;
}

export function validateIdentityPolicy(
  policy: IdentityPolicy
): IdentityServerResult<IdentityPolicy> {
  if (
    policy.rpId.length === 0 ||
    policy.rpName.length === 0 ||
    policy.allowedOrigins.length === 0 ||
    policy.allowedOrigins.some((origin) => origin.length === 0) ||
    !Number.isSafeInteger(policy.ceremonyTtlMs) ||
    policy.ceremonyTtlMs <= 0 ||
    !Number.isSafeInteger(policy.invitationTtlMs) ||
    policy.invitationTtlMs <= 0 ||
    !Number.isSafeInteger(policy.sessionTtlMs) ||
    policy.sessionTtlMs <= 0 ||
    Object.values(policy.rateLimits).some(
      (rule) =>
        !Number.isSafeInteger(rule.limit) ||
        rule.limit <= 0 ||
        !Number.isSafeInteger(rule.windowMs) ||
        rule.windowMs <= 0
    )
  ) {
    return failed('invalidRequest');
  }
  return { ok: true, value: policy };
}

export function acceptsOrigin(policy: IdentityPolicy, origin: string): boolean {
  return policy.allowedOrigins.includes(origin);
}
