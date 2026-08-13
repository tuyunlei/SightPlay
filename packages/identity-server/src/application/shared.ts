import { accepted, failed, type IdentityServerResult } from '../model/failure';
import { acceptsOrigin } from '../model/policy';
import {
  asTimestamp,
  type AccountId,
  type CeremonyRecord,
  type SessionRecord,
  type Timestamp,
} from '../model/types';

import type { IdentityUseCaseDependencies } from './dependencies';
import type { IssuedSession } from './types';

export function requireAllowedOrigin(
  dependencies: IdentityUseCaseDependencies,
  origin: string
): IdentityServerResult<undefined> {
  return acceptsOrigin(dependencies.policy, origin)
    ? accepted(undefined)
    : failed('originRejected');
}

export async function consumeRateLimit(
  dependencies: IdentityUseCaseDependencies,
  scope: Parameters<IdentityUseCaseDependencies['rateLimits']['consume']>[0]['scope'],
  subject: string,
  now: Timestamp
): Promise<IdentityServerResult<undefined>> {
  const subjectDigest = await dependencies.secrets.digest(`${scope}:${subject}`);
  const rule = dependencies.policy.rateLimits[scope];
  return dependencies.rateLimits.consume({ scope, subjectDigest, now, ...rule });
}

export async function consumeAttemptLimits(
  dependencies: IdentityUseCaseDependencies,
  source: string,
  ceremonyDigest: string,
  now: Timestamp
): Promise<IdentityServerResult<undefined>> {
  const sourceLimit = await consumeRateLimit(dependencies, 'source', source, now);
  return sourceLimit.ok
    ? consumeRateLimit(dependencies, 'ceremony', ceremonyDigest, now)
    : sourceLimit;
}

export function ceremonyMatches(
  ceremony: CeremonyRecord,
  expected: {
    readonly kind: CeremonyRecord['kind'];
    readonly origin: string;
    readonly now: Timestamp;
  }
): boolean {
  return (
    ceremony.kind === expected.kind &&
    ceremony.origin === expected.origin &&
    ceremony.consumedAt === null &&
    ceremony.expiresAt > expected.now
  );
}

export async function createSession(
  dependencies: IdentityUseCaseDependencies,
  accountId: AccountId,
  now: Timestamp
): Promise<{ readonly record: SessionRecord; readonly issued: IssuedSession }> {
  const token = dependencies.secrets.createSessionToken();
  const tokenDigest = await dependencies.secrets.digest(token);
  const expiresAt = asTimestamp(now + dependencies.policy.sessionTtlMs);
  return {
    record: {
      id: dependencies.ids.createSessionId(),
      tokenDigest,
      accountId,
      createdAt: now,
      expiresAt,
      revokedAt: null,
    },
    issued: { token, expiresAt },
  };
}
