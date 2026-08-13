import { accepted } from '../model/failure';
import type { AccountId, CredentialId } from '../model/types';

import type { IdentityUseCaseDependencies } from './dependencies';
import type { CredentialSummary } from './types';

export async function listCredentials(
  accountId: AccountId,
  dependencies: IdentityUseCaseDependencies
) {
  const credentials = await dependencies.store.listCredentials(accountId);
  return credentials.ok
    ? accepted<readonly CredentialSummary[]>(
        credentials.value.map((credential) => ({
          id: credential.id,
          name: credential.name,
          createdAt: credential.createdAt,
        }))
      )
    : credentials;
}

export async function revokeCredential(
  accountId: AccountId,
  credentialId: CredentialId,
  dependencies: IdentityUseCaseDependencies
) {
  return dependencies.store.revokeCredential({
    accountId,
    credentialId,
    now: dependencies.clock.now(),
  });
}
