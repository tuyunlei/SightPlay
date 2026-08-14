import { accepted, failed } from '../../model/failure';
import type { IdentityRateLimitPort } from '../../ports';

interface Bucket {
  readonly windowStartedAt: number;
  readonly attempts: number;
}

export class MemoryIdentityRateLimits implements IdentityRateLimitPort {
  private readonly buckets = new Map<string, Bucket>();

  async consume(input: Parameters<IdentityRateLimitPort['consume']>[0]) {
    const key = `${input.scope}:${input.subjectDigest}`;
    const current = this.buckets.get(key);
    if (!current || current.windowStartedAt + input.windowMs <= input.now) {
      this.buckets.set(key, { windowStartedAt: input.now, attempts: 1 });
      return accepted(undefined);
    }
    if (current.attempts >= input.limit) return failed('rateLimited', true);
    this.buckets.set(key, { ...current, attempts: current.attempts + 1 });
    return accepted(undefined);
  }
}
