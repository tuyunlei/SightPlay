import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';

import { asSecretDigest, asTimestamp } from '../../model/types';

import { D1IdentityRateLimits } from './d1IdentityRateLimits';
import type { D1DatabasePort } from './d1Types';

const db = env.IDENTITY_DB as unknown as D1DatabasePort;
const limits = new D1IdentityRateLimits(db);
const subjectDigest = asSecretDigest('source-digest');

beforeEach(async () => {
  await db.prepare('DELETE FROM identity_rate_limits').run();
});

describe('D1 Identity rate limits', () => {
  it('admits at most the configured number under concurrent contention', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 8 }, () =>
        limits.consume({
          scope: 'source',
          subjectDigest,
          now: asTimestamp(1_000),
          limit: 3,
          windowMs: 60_000,
        })
      )
    );

    expect(attempts.filter((result) => result.ok)).toHaveLength(3);
    expect(attempts.filter((result) => !result.ok)).toHaveLength(5);
  });

  it('opens a fresh bucket only after the configured window', async () => {
    const input = {
      scope: 'ceremony' as const,
      subjectDigest,
      now: asTimestamp(1_000),
      limit: 1,
      windowMs: 60_000,
    };

    expect(await limits.consume(input)).toMatchObject({ ok: true });
    expect(await limits.consume({ ...input, now: asTimestamp(60_999) })).toMatchObject({
      ok: false,
      failure: { code: 'rateLimited' },
    });
    expect(await limits.consume({ ...input, now: asTimestamp(61_000) })).toMatchObject({
      ok: true,
    });
  });
});
