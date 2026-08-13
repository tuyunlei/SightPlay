import { accepted, failed } from '../model/failure';
import { normalizeInvitationCode } from '../model/invitation';
import type { CredentialRecord } from '../model/types';

import type { IdentityUseCaseDependencies } from './dependencies';
import {
  ceremonyMatches,
  consumeAttemptLimits,
  createSession,
  requireAllowedOrigin,
} from './shared';
import type { CompleteIdentityResult } from './types';

export async function completeRegistration(
  input: {
    readonly inviteCode: string;
    readonly name?: string;
    readonly origin: string;
    readonly source: string;
    readonly response: Readonly<Record<string, unknown>>;
  },
  dependencies: IdentityUseCaseDependencies
): Promise<CompleteIdentityResult> {
  const allowedOrigin = requireAllowedOrigin(dependencies, input.origin);
  if (!allowedOrigin.ok) return allowedOrigin;
  const invitationCode = normalizeInvitationCode(input.inviteCode);
  if (!invitationCode) return failed('invitationInvalid');
  const challenge = dependencies.webAuthn.readRegistrationChallenge(input.response);
  if (!challenge.ok) return challenge;

  const now = dependencies.clock.now();
  const [challengeDigest, invitationDigest] = await Promise.all([
    dependencies.secrets.digest(challenge.value),
    dependencies.secrets.digest(invitationCode),
  ]);
  const rateLimit = await consumeAttemptLimits(dependencies, input.source, challengeDigest, now);
  if (!rateLimit.ok) return rateLimit;
  const context = await dependencies.store.findRegistrationContext({
    now,
    challengeDigest,
    invitationDigest,
  });
  if (!context.ok) return context;
  const { ceremony } = context.value;
  if (
    !ceremonyMatches(ceremony, { kind: 'registration', origin: input.origin, now }) ||
    ceremony.rpId !== dependencies.policy.rpId ||
    ceremony.accountId === null
  ) {
    return failed('ceremonyInvalid');
  }

  const verification = await dependencies.webAuthn.verifyRegistration({
    response: input.response,
    challenge: challenge.value,
    origin: input.origin,
    rpId: dependencies.policy.rpId,
    userVerification: dependencies.policy.userVerification,
  });
  if (!verification.ok) return verification;
  if (!Number.isSafeInteger(verification.value.counter) || verification.value.counter < 0) {
    return failed('invalidRequest');
  }
  const credentialName = normalizeCredentialName(input.name, verification.value.authenticatorName);
  if (!credentialName) return failed('invalidRequest');

  const account = { id: ceremony.accountId, status: 'active' as const, createdAt: now };
  const credential: CredentialRecord = {
    id: verification.value.credentialId,
    accountId: account.id,
    publicKey: verification.value.publicKey,
    publicKeyFormat: verification.value.publicKeyFormat,
    algorithm: verification.value.algorithm,
    counter: verification.value.counter,
    transports: verification.value.transports,
    name: credentialName,
    createdAt: now,
    revokedAt: null,
  };
  const session = await createSession(dependencies, account.id, now);
  const committed = await dependencies.store.completeRegistration({
    now,
    account,
    credential,
    ceremonyId: ceremony.id,
    invitationDigest,
    session: session.record,
  });
  return committed.ok ? accepted(session.issued) : committed;
}

function normalizeCredentialName(input: string | undefined, fallback: string): string | null {
  const value = input?.trim() || fallback.trim() || 'Passkey';
  return value.length <= 80 ? value : null;
}
