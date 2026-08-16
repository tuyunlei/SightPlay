import {
  createHybridWebAuthnServer,
  createSystemIdentityPorts,
  validateIdentityPolicy,
  type IdentityPolicy,
  type IdentityUseCaseDependencies,
} from '@sightplay/identity-server';

import type { PlatformContext } from '../../platform';

export function createIdentityDependencies(platform: PlatformContext): IdentityUseCaseDependencies {
  if (!platform.identityStore) throw new Error('IDENTITY_DB binding not available');
  if (!platform.identityRateLimits) throw new Error('Identity rate-limit binding not available');
  const policy = readIdentityPolicy(platform);
  const validated = validateIdentityPolicy(policy);
  if (!validated.ok) throw new Error('Identity policy is invalid');
  return {
    ...createSystemIdentityPorts(),
    policy: validated.value,
    rateLimits: platform.identityRateLimits,
    store: platform.identityStore,
    webAuthn: createHybridWebAuthnServer(),
  };
}

function readIdentityPolicy(platform: PlatformContext): IdentityPolicy {
  return {
    rpId: requireConfig(platform, 'WEBAUTHN_RP_ID'),
    rpName: requireConfig(platform, 'WEBAUTHN_RP_NAME'),
    allowedOrigins: readList(platform.env('IDENTITY_ALLOWED_ORIGINS')),
    allowedHttpsSubdomainSuffixes: readList(
      platform.env('IDENTITY_ALLOWED_HTTPS_SUBDOMAIN_SUFFIXES')
    ),
    userVerification:
      requireConfig(platform, 'WEBAUTHN_USER_VERIFICATION') === 'required'
        ? 'required'
        : 'preferred',
    ceremonyTtlMs: parsePositiveInteger(platform, 'IDENTITY_CEREMONY_TTL_MS'),
    invitationTtlMs: parsePositiveInteger(platform, 'IDENTITY_INVITATION_TTL_MS'),
    sessionTtlMs: parsePositiveInteger(platform, 'IDENTITY_SESSION_TTL_MS'),
    rateLimits: {
      source: readRateLimit(platform, 'SOURCE'),
      ceremony: readRateLimit(platform, 'CEREMONY'),
      invitation: readRateLimit(platform, 'INVITATION'),
      account: readRateLimit(platform, 'ACCOUNT'),
    },
  };
}

function readList(value: string | undefined): readonly string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readRateLimit(platform: PlatformContext, scope: string) {
  return {
    limit: parsePositiveInteger(platform, `IDENTITY_RATE_LIMIT_${scope}_COUNT`),
    windowMs: parsePositiveInteger(platform, `IDENTITY_RATE_LIMIT_${scope}_WINDOW_MS`),
  };
}

function requireConfig(platform: PlatformContext, name: string): string {
  const value = platform.env(name);
  if (!value) throw new Error(`Identity configuration ${name} is required`);
  return value;
}

function parsePositiveInteger(platform: PlatformContext, name: string): number {
  const value = Number(requireConfig(platform, name));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Identity configuration ${name} must be a positive integer`);
  }
  return value;
}
