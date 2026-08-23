import { accepted } from '../model/failure';
import { asTimestamp, type AccountId, type InvitationAccessRecord } from '../model/types';

import type { IdentityUseCaseDependencies } from './dependencies';
import { consumeRateLimit } from './shared';

export interface InvitationAccessSummary {
  readonly id: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}

export async function getInvitationAccess(
  accountId: AccountId,
  dependencies: IdentityUseCaseDependencies
) {
  const result = await dependencies.store.getInvitationAccess(accountId, dependencies.clock.now());
  return result.ok ? accepted(result.value ? toSummary(result.value) : null) : result;
}

export async function createInvitationAccess(
  accountId: AccountId,
  dependencies: IdentityUseCaseDependencies
) {
  const now = dependencies.clock.now();
  const rateLimit = await consumeRateLimit(dependencies, 'account', accountId, now);
  if (!rateLimit.ok) return rateLimit;
  const token = dependencies.secrets.createInvitationAccessToken();
  const credential: InvitationAccessRecord = {
    id: dependencies.ids.createInvitationAccessId(),
    tokenDigest: await dependencies.secrets.digest(token),
    accountId,
    createdAt: now,
    expiresAt: asTimestamp(now + dependencies.policy.invitationAccessTtlMs),
    revokedAt: null,
  };
  const stored = await dependencies.store.replaceInvitationAccess({ now, credential });
  return stored.ok ? accepted({ token, credential: toSummary(credential) }) : stored;
}

export function revokeInvitationAccess(
  accountId: AccountId,
  dependencies: IdentityUseCaseDependencies
) {
  return dependencies.store.revokeInvitationAccess({
    accountId,
    now: dependencies.clock.now(),
  });
}

export async function authenticateInvitationAccess(
  token: string,
  dependencies: IdentityUseCaseDependencies
) {
  const tokenDigest = await dependencies.secrets.digest(token);
  const result = await dependencies.store.findInvitationAccess({
    now: dependencies.clock.now(),
    tokenDigest,
  });
  return result.ok ? accepted({ accountId: result.value.accountId }) : result;
}

function toSummary(record: InvitationAccessRecord): InvitationAccessSummary {
  return {
    id: record.id,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  };
}
