export type RouteDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type PublicAppRoute = { kind: 'login' } | { kind: 'register'; inviteCode?: string };

export type ProtectedAppRoute =
  | { kind: 'randomPractice' }
  | { kind: 'library'; difficulty?: RouteDifficulty }
  | { kind: 'songPractice'; songId: string }
  | { kind: 'passkeys' };

export type AppRoute = PublicAppRoute | ProtectedAppRoute;

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

function decodeQueryComponent(value: string): string | null {
  return decodePathSegment(value.replace(/\+/g, ' '));
}

function readQueryParam(search: string, key: string): string | undefined {
  for (const encodedPair of search.replace(/^\?/, '').split('&')) {
    const separatorIndex = encodedPair.indexOf('=');
    const encodedKey = separatorIndex < 0 ? encodedPair : encodedPair.slice(0, separatorIndex);
    if (decodeQueryComponent(encodedKey) !== key) continue;

    const encodedValue = separatorIndex < 0 ? '' : encodedPair.slice(separatorIndex + 1);
    return decodeQueryComponent(encodedValue) ?? undefined;
  }

  return undefined;
}

function serializeQueryParam(key: string, value: string): string {
  return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function decodeDifficulty(value: string | undefined): RouteDifficulty | undefined {
  if (value === 'beginner' || value === 'intermediate' || value === 'advanced') return value;
  return undefined;
}

export function isPublicAppRoute(route: AppRoute): route is PublicAppRoute {
  return route.kind === 'login' || route.kind === 'register';
}

export function parseAppRoute({ pathname, search = '' }: RouteLocation): AppRoute {
  if (pathname === '/register') {
    return { kind: 'register', inviteCode: readQueryParam(search, 'code') };
  }
  if (pathname === '/library') {
    return { kind: 'library', difficulty: decodeDifficulty(readQueryParam(search, 'difficulty')) };
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
