import { accepted, failed } from '../../model/failure';
import type { IdentityRateLimitPort } from '../../ports';

import type { D1DatabasePort } from './d1Types';

export class D1IdentityRateLimits implements IdentityRateLimitPort {
  constructor(private readonly db: D1DatabasePort) {}

  async consume(input: Parameters<IdentityRateLimitPort['consume']>[0]) {
    const row = await this.db
      .prepare(
        `INSERT INTO identity_rate_limits
           (scope, subject_digest, window_started_at, attempts)
         VALUES (?, ?, ?, 1)
         ON CONFLICT(scope, subject_digest) DO UPDATE SET
           window_started_at = CASE
             WHEN identity_rate_limits.window_started_at + ? <= ? THEN ?
             ELSE identity_rate_limits.window_started_at
           END,
           attempts = CASE
             WHEN identity_rate_limits.window_started_at + ? <= ? THEN 1
             ELSE identity_rate_limits.attempts + 1
           END
         WHERE identity_rate_limits.window_started_at + ? <= ?
            OR identity_rate_limits.attempts < ?
         RETURNING attempts`
      )
      .bind(
        input.scope,
        input.subjectDigest,
        input.now,
        input.windowMs,
        input.now,
        input.now,
        input.windowMs,
        input.now,
        input.windowMs,
        input.now,
        input.limit
      )
      .first<{ readonly attempts: number }>();
    return row ? accepted(undefined) : failed('rateLimited', true);
  }
}

export function createD1IdentityRateLimits(db: D1DatabasePort): IdentityRateLimitPort {
  return new D1IdentityRateLimits(db);
}
