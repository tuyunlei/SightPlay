import {
  isPublicAppRoute,
  type AppRoute,
  type ProtectedAppRoute,
  type PublicAppRoute,
} from './route';

export type IdentitySessionStatus = 'loading' | 'anonymous' | 'authenticated';

export interface IdentitySessionView {
  status: IdentitySessionStatus;
  hasPasskeys: boolean;
}

export type AppScene =
  | { kind: 'booting' }
  | { kind: 'anonymous'; route: PublicAppRoute }
  | { kind: 'authenticated'; route: ProtectedAppRoute }
  | { kind: 'redirect'; route: AppRoute };

export function selectAppScene(identity: IdentitySessionView, route: AppRoute): AppScene {
  if (identity.status === 'loading') return { kind: 'booting' };

  if (identity.status === 'anonymous') {
    if (!identity.hasPasskeys && route.kind !== 'register') {
      return { kind: 'redirect', route: { kind: 'register' } };
    }
    return isPublicAppRoute(route)
      ? { kind: 'anonymous', route }
      : { kind: 'redirect', route: { kind: 'login' } };
  }

  return isPublicAppRoute(route)
    ? { kind: 'redirect', route: { kind: 'course' } }
    : { kind: 'authenticated', route };
}
