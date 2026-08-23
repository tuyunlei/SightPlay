import { describe, expect, it } from 'vitest';

import { isPracticeAppRoute, parseAppRoute, serializeAppRoute, type AppRoute } from './route';

describe('App route', () => {
  it.each<[AppRoute, string]>([
    [{ kind: 'login' }, '/'],
    [{ kind: 'register' }, '/register'],
    [{ kind: 'register', inviteCode: 'ABCD-EFGH' }, '/register?code=ABCD-EFGH'],
    [{ kind: 'randomPractice' }, '/practice'],
    [{ kind: 'library' }, '/library'],
    [{ kind: 'library', difficulty: 'intermediate' }, '/library?difficulty=intermediate'],
    [{ kind: 'songPractice', songId: 'song / 1' }, '/songs/song%20%2F%201'],
    [{ kind: 'passkeys' }, '/passkeys'],
    [{ kind: 'passkeys', returnTo: { kind: 'randomPractice' } }, '/passkeys?from=practice'],
    [
      { kind: 'passkeys', returnTo: { kind: 'library', difficulty: 'advanced' } },
      '/passkeys?from=library&difficulty=advanced',
    ],
    [
      { kind: 'passkeys', returnTo: { kind: 'songPractice', songId: 'song / 1' } },
      '/passkeys?from=song&songId=song%20%2F%201',
    ],
  ])('round trips %o', (route, href) => {
    expect(serializeAppRoute(route)).toBe(href);
    const url = new URL(href, 'https://sightplay.example');
    expect(parseAppRoute(url)).toEqual(route);
  });

  it('falls back to login for an unknown route', () => {
    expect(parseAppRoute({ pathname: '/unknown' })).toEqual({ kind: 'login' });
  });

  it.each([
    [{ kind: 'randomPractice' }, true],
    [{ kind: 'songPractice', songId: 'song-1' }, true],
    [{ kind: 'library' }, false],
    [{ kind: 'passkeys', returnTo: { kind: 'randomPractice' } }, false],
  ] as const)('identifies whether %o is an active practice route', (route, expected) => {
    expect(isPracticeAppRoute(route)).toBe(expected);
  });

  it('treats a key-only query parameter as an empty value', () => {
    expect(parseAppRoute({ pathname: '/register', search: '?code' })).toEqual({
      kind: 'register',
      inviteCode: '',
    });
  });

  it('decodes form-encoded query parameter names and values', () => {
    expect(parseAppRoute({ pathname: '/register', search: '?c%6Fde=ABCD%2BEFGH' })).toEqual({
      kind: 'register',
      inviteCode: 'ABCD+EFGH',
    });
  });

  it('discards an unrecognized difficulty at the URL boundary', () => {
    expect(parseAppRoute({ pathname: '/library', search: '?difficulty=expert' })).toEqual({
      kind: 'library',
    });
  });

  it('discards an invalid passkey return target at the URL boundary', () => {
    expect(parseAppRoute({ pathname: '/passkeys', search: '?from=song' })).toEqual({
      kind: 'passkeys',
    });
    expect(parseAppRoute({ pathname: '/passkeys', search: '?from=register' })).toEqual({
      kind: 'passkeys',
    });
  });

  it.each(['/songs/%', '/songs/%E0'])(
    'falls back to login for a malformed encoded song route: %s',
    (pathname) => {
      expect(parseAppRoute({ pathname })).toEqual({ kind: 'login' });
    }
  );
});
