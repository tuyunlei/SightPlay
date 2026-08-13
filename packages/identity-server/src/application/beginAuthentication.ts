import { accepted } from '../model/failure';
import { asTimestamp, type CeremonyRecord } from '../model/types';

import type { IdentityUseCaseDependencies } from './dependencies';
import { consumeRateLimit, requireAllowedOrigin } from './shared';
import type { BeginAuthenticationResult } from './types';

export async function beginAuthentication(
  input: { readonly origin: string; readonly source: string },
  dependencies: IdentityUseCaseDependencies
): Promise<BeginAuthenticationResult> {
  const allowedOrigin = requireAllowedOrigin(dependencies, input.origin);
  if (!allowedOrigin.ok) return allowedOrigin;
  const now = dependencies.clock.now();
  const rateLimit = await consumeRateLimit(dependencies, 'source', input.source, now);
  if (!rateLimit.ok) return rateLimit;
  const challenge = dependencies.secrets.createChallenge();
  const challengeDigest = await dependencies.secrets.digest(challenge);
  const ceremony: CeremonyRecord = {
    id: dependencies.ids.createCeremonyId(),
    challengeDigest,
    kind: 'authentication',
    accountId: null,
    invitationDigest: null,
    rpId: dependencies.policy.rpId,
    origin: input.origin,
    expiresAt: asTimestamp(now + dependencies.policy.ceremonyTtlMs),
    consumedAt: null,
  };
  const credentials = await dependencies.store.beginAuthentication({ now, ceremony });
  if (!credentials.ok) return credentials;
  return accepted({
    challenge,
    allowCredentials: credentials.value.map((credential) => ({
      id: credential.id,
      transports: credential.transports,
    })),
    userVerification: dependencies.policy.userVerification,
    timeout: dependencies.policy.ceremonyTtlMs,
  });
}
