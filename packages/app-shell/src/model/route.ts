export type AppRoute =
  | { kind: 'login' }
  | { kind: 'register'; inviteCode?: string }
  | { kind: 'randomPractice' }
  | { kind: 'library'; difficulty?: string }
  | { kind: 'songPractice'; songId: string }
  | { kind: 'passkeys' };

export interface RouteLocation {
  pathname: string;
  search?: string;
}

function decodePathSegment(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function readQueryParam(search: string, key: string): string | undefined {
  const encodedPair = search
    .replace(/^\?/, '')
    .split('&')
    .find((pair) => pair.split('=', 1)[0] === encodeURIComponent(key));
  if (!encodedPair) return undefined;

  const encodedValue = encodedPair.slice(encodedPair.indexOf('=') + 1).replace(/\+/g, ' ');
  return decodePathSegment(encodedValue) ?? undefined;
}

function serializeQueryParam(key: string, value: string): string {
  return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

export function parseAppRoute({ pathname, search = '' }: RouteLocation): AppRoute {
  if (pathname === '/register') {
    return { kind: 'register', inviteCode: readQueryParam(search, 'code') };
  }
  if (pathname === '/library') {
    return { kind: 'library', difficulty: readQueryParam(search, 'difficulty') };
  }
  if (pathname.startsWith('/songs/')) {
    const songId = decodePathSegment(pathname.slice('/songs/'.length));
    if (songId) return { kind: 'songPractice', songId };
  }
  if (pathname === '/passkeys') return { kind: 'passkeys' };
  if (pathname === '/practice') return { kind: 'randomPractice' };

  return { kind: 'login' };
}

export function serializeAppRoute(route: AppRoute): string {
  switch (route.kind) {
    case 'login':
      return '/';
    case 'register': {
      if (!route.inviteCode) return '/register';
      return `/register?${serializeQueryParam('code', route.inviteCode)}`;
    }
    case 'randomPractice':
      return '/practice';
    case 'library': {
      if (!route.difficulty) return '/library';
      return `/library?${serializeQueryParam('difficulty', route.difficulty)}`;
    }
    case 'songPractice':
      return `/songs/${encodeURIComponent(route.songId)}`;
    case 'passkeys':
      return '/passkeys';
  }
}
