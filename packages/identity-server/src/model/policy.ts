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
  readonly allowedHttpsSubdomainSuffixes: readonly string[];
  readonly userVerification: 'required' | 'preferred';
  readonly ceremonyTtlMs: number;
  readonly invitationTtlMs: number;
  readonly invitationAccessTtlMs: number;
  readonly sessionTtlMs: number;
  readonly rateLimits: Readonly<Record<IdentityRateLimitScope, IdentityRateLimitPolicy>>;
}

export function validateIdentityPolicy(
  policy: IdentityPolicy
): IdentityServerResult<IdentityPolicy> {
  if (
    policy.rpId.length === 0 ||
    policy.rpName.length === 0 ||
    (policy.allowedOrigins.length === 0 && policy.allowedHttpsSubdomainSuffixes.length === 0) ||
    policy.allowedOrigins.some((origin) => origin.length === 0) ||
    policy.allowedHttpsSubdomainSuffixes.some((suffix) => !isCanonicalDomain(suffix)) ||
    !isPositiveSafeInteger(policy.ceremonyTtlMs) ||
    !isPositiveSafeInteger(policy.invitationTtlMs) ||
    !isPositiveSafeInteger(policy.invitationAccessTtlMs) ||
    !isPositiveSafeInteger(policy.sessionTtlMs) ||
    Object.values(policy.rateLimits).some(
      (rule) => !isPositiveSafeInteger(rule.limit) || !isPositiveSafeInteger(rule.windowMs)
    )
  ) {
    return failed('invalidRequest');
  }
  return { ok: true, value: policy };
}

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function acceptsOrigin(policy: IdentityPolicy, origin: string): boolean {
  if (policy.allowedOrigins.includes(origin)) return true;

  const hostname = parseCanonicalHttpsOrigin(origin);
  if (hostname === undefined) return false;

  return policy.allowedHttpsSubdomainSuffixes.some(
    (suffix) => hostname !== suffix && hostname.endsWith(`.${suffix}`)
  );
}

function isCanonicalDomain(value: string): boolean {
  return value.length <= 253 && value.split('.').every(isCanonicalDomainLabel);
}

function parseCanonicalHttpsOrigin(value: string): string | undefined {
  const prefix = 'https://';
  if (!value.startsWith(prefix)) return undefined;
  const hostname = value.slice(prefix.length);
  return isCanonicalDomain(hostname) ? hostname : undefined;
}

function isCanonicalDomainLabel(label: string): boolean {
  if (label.length === 0 || label.length > 63) return false;
  if (!isLowercaseLetterOrDigit(label[0]) || !isLowercaseLetterOrDigit(label[label.length - 1])) {
    return false;
  }
  return [...label].every((character) => isLowercaseLetterOrDigit(character) || character === '-');
}

function isLowercaseLetterOrDigit(character: string | undefined): boolean {
  return (
    character !== undefined &&
    ((character >= 'a' && character <= 'z') || (character >= '0' && character <= '9'))
  );
}
