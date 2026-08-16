import { accepted, failed } from '../model/failure';
import { normalizeInvitationCode } from '../model/invitation';
import { asTimestamp, type CeremonyRecord } from '../model/types';

import type { IdentityUseCaseDependencies } from './dependencies';
import { consumeRateLimit, requireAllowedOrigin } from './shared';
import type { BeginRegistrationResult } from './types';

export async function beginRegistration(
  input: { readonly inviteCode: string; readonly origin: string; readonly source: string },
  dependencies: IdentityUseCaseDependencies
): Promise<BeginRegistrationResult> {
  const allowedOrigin = requireAllowedOrigin(dependencies, input.origin);
  if (!allowedOrigin.ok) return allowedOrigin;
  const invitationCode = normalizeInvitationCode(input.inviteCode);
  if (!invitationCode) return failed('invitationInvalid');

  const now = dependencies.clock.now();
  const sourceLimit = await consumeRateLimit(dependencies, 'source', input.source, now);
  if (!sourceLimit.ok) return sourceLimit;
  const invitationLimit = await consumeRateLimit(dependencies, 'invitation', invitationCode, now);
  if (!invitationLimit.ok) return invitationLimit;
  const challenge = dependencies.secrets.createChallenge();
  const [challengeDigest, invitationDigest] = await Promise.all([
    dependencies.secrets.digest(challenge),
    dependencies.secrets.digest(invitationCode),
  ]);
  const accountId = dependencies.ids.createAccountId();
  const ceremony: CeremonyRecord = {
    id: dependencies.ids.createCeremonyId(),
    challengeDigest,
    kind: 'registration',
    accountId,
    invitationDigest,
    rpId: dependencies.policy.rpId,
    origin: input.origin,
    expiresAt: asTimestamp(now + dependencies.policy.ceremonyTtlMs),
    consumedAt: null,
  };
  const stored = await dependencies.store.beginRegistration({ now, ceremony });
  if (!stored.ok) return stored;

  return accepted({
    challenge,
    rp: { id: dependencies.policy.rpId, name: dependencies.policy.rpName },
    user: {
      id: dependencies.webAuthn.encodeUserHandle(accountId),
      name: `account-${accountId}`,
      displayName: 'SightPlay User',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: dependencies.policy.userVerification,
    },
    timeout: dependencies.policy.ceremonyTtlMs,
  });
}
