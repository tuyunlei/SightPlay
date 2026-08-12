export type AppRoute =
  | { kind: 'login' }
  | { kind: 'register'; inviteCode?: string }
  | { kind: 'randomPractice' }
  | { kind: 'library'; difficulty?: string }
  | { kind: 'songPractice'; songId: string }
  | { kind: 'passkeys' };

interface RouteLocation {
  pathname: string;
  search?: string;
}

export function parseAppRoute({ pathname, search = '' }: RouteLocation): AppRoute {
  const params = new URLSearchParams(search);

  if (pathname === '/register') {
    return { kind: 'register', inviteCode: params.get('code') ?? undefined };
  }
  if (pathname === '/library') {
    return { kind: 'library', difficulty: params.get('difficulty') ?? undefined };
  }
  if (pathname.startsWith('/songs/')) {
    const songId = decodeURIComponent(pathname.slice('/songs/'.length));
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
      const params = new URLSearchParams({ code: route.inviteCode });
      return `/register?${params.toString()}`;
    }
    case 'randomPractice':
      return '/practice';
    case 'library': {
      if (!route.difficulty) return '/library';
      const params = new URLSearchParams({ difficulty: route.difficulty });
      return `/library?${params.toString()}`;
    }
    case 'songPractice':
      return `/songs/${encodeURIComponent(route.songId)}`;
    case 'passkeys':
      return '/passkeys';
  }
}
