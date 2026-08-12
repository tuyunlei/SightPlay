import {
  isPublicAppRoute,
  type AppRoute,
  type ProtectedAppRoute,
  type PublicAppRoute,
} from './route';

export type IdentitySessionStatus = 'loading' | 'anonymous' | 'authenticated';

export type AppScene =
  | { kind: 'booting' }
  | { kind: 'anonymous'; route: PublicAppRoute }
  | { kind: 'authenticated'; route: ProtectedAppRoute }
  | { kind: 'redirect'; route: AppRoute };

export function selectAppScene(status: IdentitySessionStatus, route: AppRoute): AppScene {
  if (status === 'loading') return { kind: 'booting' };

  if (status === 'anonymous') {
    return isPublicAppRoute(route)
      ? { kind: 'anonymous', route }
      : { kind: 'redirect', route: { kind: 'login' } };
  }

  return isPublicAppRoute(route)
    ? { kind: 'redirect', route: { kind: 'randomPractice' } }
    : { kind: 'authenticated', route };
}
