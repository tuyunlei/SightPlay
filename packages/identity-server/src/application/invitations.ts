import { accepted, failed } from '../model/failure';
import { normalizeInvitationCode } from '../model/invitation';
import { asTimestamp, type AccountId, type InvitationRecord } from '../model/types';

import type { IdentityUseCaseDependencies } from './dependencies';
import { consumeRateLimit } from './shared';

export async function createInvitations(
  input: { readonly issuerAccountId: AccountId | null; readonly count: number },
  dependencies: IdentityUseCaseDependencies
) {
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 10) {
    return failed('invalidRequest');
  }
  const now = dependencies.clock.now();
  const rateLimit = await consumeRateLimit(
    dependencies,
    'account',
    input.issuerAccountId ?? 'admin',
    now
  );
  if (!rateLimit.ok) return rateLimit;
  const rawCodes = new Set<string>();
  while (rawCodes.size < input.count) rawCodes.add(dependencies.secrets.createInvitationCode());
  const codes = [...rawCodes];
  const normalizedCodes = codes.map(normalizeInvitationCode);
  if (!normalizedCodes.every((code): code is string => code !== null)) return failed('internal');
  const records = await Promise.all(
    normalizedCodes.map(async (normalized): Promise<InvitationRecord> => {
      return {
        codeDigest: await dependencies.secrets.digest(normalized),
        purpose: 'createAccount',
        issuerAccountId: input.issuerAccountId,
        expiresAt: asTimestamp(now + dependencies.policy.invitationTtlMs),
        consumedAt: null,
        consumedByAccountId: null,
      };
    })
  );
  const committed = await dependencies.store.createInvitations(records);
  return committed.ok ? accepted(codes) : committed;
}

export async function validateInvitation(
  input: { readonly code: string; readonly source: string },
  dependencies: IdentityUseCaseDependencies
) {
  const normalized = normalizeInvitationCode(input.code);
  if (!normalized) return failed('invitationInvalid');
  const now = dependencies.clock.now();
  const sourceLimit = await consumeRateLimit(dependencies, 'source', input.source, now);
  if (!sourceLimit.ok) return sourceLimit;
  const invitationLimit = await consumeRateLimit(dependencies, 'invitation', normalized, now);
  if (!invitationLimit.ok) return invitationLimit;
  const invitationDigest = await dependencies.secrets.digest(normalized);
  return dependencies.store.validateInvitation({ now, invitationDigest });
}
