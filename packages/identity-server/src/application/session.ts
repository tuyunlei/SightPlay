import { accepted } from '../model/failure';

import type { IdentityUseCaseDependencies } from './dependencies';
import type { AuthenticatedSession } from './types';

export async function authenticateSession(
  token: string,
  dependencies: IdentityUseCaseDependencies
) {
  const now = dependencies.clock.now();
  const tokenDigest = await dependencies.secrets.digest(token);
  const session = await dependencies.store.findSession({ now, tokenDigest });
  if (!session.ok) return session;
  return accepted<AuthenticatedSession>({
    accountId: session.value.accountId,
    expiresAt: session.value.expiresAt,
  });
}

export async function revokeSession(token: string, dependencies: IdentityUseCaseDependencies) {
  const now = dependencies.clock.now();
  const tokenDigest = await dependencies.secrets.digest(token);
  return dependencies.store.revokeSession({ now, tokenDigest });
}
