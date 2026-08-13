import { accepted, failed } from '../model/failure';

import type { IdentityUseCaseDependencies } from './dependencies';
import {
  ceremonyMatches,
  consumeAttemptLimits,
  createSession,
  requireAllowedOrigin,
} from './shared';
import type { CompleteIdentityResult } from './types';

export async function completeAuthentication(
  input: {
    readonly origin: string;
    readonly source: string;
    readonly response: Readonly<Record<string, unknown>>;
  },
  dependencies: IdentityUseCaseDependencies
): Promise<CompleteIdentityResult> {
  const allowedOrigin = requireAllowedOrigin(dependencies, input.origin);
  if (!allowedOrigin.ok) return allowedOrigin;
  const envelope = dependencies.webAuthn.readAuthenticationEnvelope(input.response);
  if (!envelope.ok) return envelope;
  const now = dependencies.clock.now();
  const challengeDigest = await dependencies.secrets.digest(envelope.value.challenge);
  const rateLimit = await consumeAttemptLimits(dependencies, input.source, challengeDigest, now);
  if (!rateLimit.ok) return rateLimit;
  const context = await dependencies.store.findAuthenticationContext({
    now,
    challengeDigest,
    credentialId: envelope.value.credentialId,
  });
  if (!context.ok) return context;
  if (
    !ceremonyMatches(context.value.ceremony, {
      kind: 'authentication',
      origin: input.origin,
      now,
    }) ||
    context.value.ceremony.rpId !== dependencies.policy.rpId
  ) {
    return failed('ceremonyInvalid');
  }
  const verification = await dependencies.webAuthn.verifyAuthentication({
    response: input.response,
    challenge: envelope.value.challenge,
    origin: input.origin,
    rpId: dependencies.policy.rpId,
    userVerification: dependencies.policy.userVerification,
    credential: context.value.credential,
  });
  if (!verification.ok) return verification;
  if (
    !Number.isSafeInteger(verification.value.counter) ||
    verification.value.counter < context.value.credential.counter
  ) {
    return failed('counterRegression');
  }
  const session = await createSession(dependencies, context.value.credential.accountId, now);
  const committed = await dependencies.store.completeAuthentication({
    now,
    ceremonyId: context.value.ceremony.id,
    credentialId: context.value.credential.id,
    nextCounter: verification.value.counter,
    session: session.record,
  });
  return committed.ok ? accepted(session.issued) : committed;
}
