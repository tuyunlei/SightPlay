export type RouteDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type PublicAppRoute = { kind: 'login' } | { kind: 'register'; inviteCode?: string };

export type AppContentRoute =
  | { kind: 'randomPractice' }
  | { kind: 'library'; difficulty?: RouteDifficulty }
  | { kind: 'songPractice'; songId: string };

export type PasskeysAppRoute = { kind: 'passkeys'; returnTo?: AppContentRoute };

export type ProtectedAppRoute = AppContentRoute | PasskeysAppRoute;

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

function decodePasskeysReturnRoute(search: string): AppContentRoute | undefined {
  switch (readQueryParam(search, 'from')) {
    case 'practice':
      return { kind: 'randomPractice' };
    case 'library':
      return {
        kind: 'library',
        difficulty: decodeDifficulty(readQueryParam(search, 'difficulty')),
      };
    case 'song': {
      const songId = readQueryParam(search, 'songId');
      return songId ? { kind: 'songPractice', songId } : undefined;
    }
    default:
      return undefined;
  }
}

export function isPublicAppRoute(route: AppRoute): route is PublicAppRoute {
  return route.kind === 'login' || route.kind === 'register';
}

export function isPracticeAppRoute(
  route: ProtectedAppRoute
): route is Extract<AppContentRoute, { kind: 'randomPractice' | 'songPractice' }> {
  return route.kind === 'randomPractice' || route.kind === 'songPractice';
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
  if (pathname === '/passkeys') {
    return { kind: 'passkeys', returnTo: decodePasskeysReturnRoute(search) };
  }
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
    case 'passkeys': {
      if (!route.returnTo) return '/passkeys';
      switch (route.returnTo.kind) {
        case 'randomPractice':
          return '/passkeys?from=practice';
        case 'library': {
          const from = serializeQueryParam('from', 'library');
          if (!route.returnTo.difficulty) return `/passkeys?${from}`;
          return `/passkeys?${from}&${serializeQueryParam('difficulty', route.returnTo.difficulty)}`;
        }
        case 'songPractice':
          return `/passkeys?${serializeQueryParam('from', 'song')}&${serializeQueryParam('songId', route.returnTo.songId)}`;
      }
    }
  }
}
