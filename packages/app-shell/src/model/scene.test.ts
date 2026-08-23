import { describe, expect, it } from 'vitest';

import type { AppRoute } from './route';
import { selectAppScene, type IdentitySessionView } from './scene';

describe('App scene selection', () => {
  it.each<[IdentitySessionView, AppRoute, ReturnType<typeof selectAppScene>]>([
    [{ status: 'loading', hasPasskeys: false }, { kind: 'library' }, { kind: 'booting' }],
    [
      { status: 'anonymous', hasPasskeys: true },
      { kind: 'login' },
      { kind: 'anonymous', route: { kind: 'login' } },
    ],
    [
      { status: 'anonymous', hasPasskeys: false },
      { kind: 'login' },
      { kind: 'redirect', route: { kind: 'register' } },
    ],
    [
      { status: 'anonymous', hasPasskeys: false },
      { kind: 'register', inviteCode: 'ABCD-EFGH' },
      { kind: 'anonymous', route: { kind: 'register', inviteCode: 'ABCD-EFGH' } },
    ],
    [
      { status: 'anonymous', hasPasskeys: true },
      { kind: 'passkeys' },
      { kind: 'redirect', route: { kind: 'login' } },
    ],
    [
      { status: 'anonymous', hasPasskeys: false },
      { kind: 'passkeys' },
      { kind: 'redirect', route: { kind: 'register' } },
    ],
    [
      { status: 'authenticated', hasPasskeys: true },
      { kind: 'login' },
      { kind: 'redirect', route: { kind: 'course' } },
    ],
    [
      { status: 'authenticated', hasPasskeys: true },
      { kind: 'library', difficulty: 'intermediate' },
      { kind: 'authenticated', route: { kind: 'library', difficulty: 'intermediate' } },
    ],
  ])('selects $0 + $1', (identity, route, expected) => {
    expect(selectAppScene(identity, route)).toEqual(expected);
  });
});
