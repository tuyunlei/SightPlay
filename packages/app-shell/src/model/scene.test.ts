import { describe, expect, it } from 'vitest';

import type { AppRoute } from './route';
import { selectAppScene, type IdentitySessionStatus } from './scene';

describe('App scene selection', () => {
  it.each<[IdentitySessionStatus, AppRoute, ReturnType<typeof selectAppScene>]>([
    ['loading', { kind: 'library' }, { kind: 'booting' }],
    ['anonymous', { kind: 'login' }, { kind: 'anonymous', route: { kind: 'login' } }],
    [
      'anonymous',
      { kind: 'register', inviteCode: 'ABCD-EFGH' },
      { kind: 'anonymous', route: { kind: 'register', inviteCode: 'ABCD-EFGH' } },
    ],
    ['anonymous', { kind: 'passkeys' }, { kind: 'redirect', route: { kind: 'login' } }],
    ['authenticated', { kind: 'login' }, { kind: 'redirect', route: { kind: 'randomPractice' } }],
    [
      'authenticated',
      { kind: 'library', difficulty: 'intermediate' },
      { kind: 'authenticated', route: { kind: 'library', difficulty: 'intermediate' } },
    ],
  ])('selects %s + %o', (status, route, expected) => {
    expect(selectAppScene(status, route)).toEqual(expected);
  });
});
