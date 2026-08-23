import { createContext } from 'react';

import type { AccountAccessState } from '../model/types';

export interface AccountAccessClient {
  readonly state: AccountAccessState;
  requestInvitation(): void;
  dismissInvitation(): void;
  requestCredentialRevocation(credentialId: string): void;
  requestInvitationAccess(): void;
  dismissInvitationAccessToken(): void;
  requestInvitationAccessRevocation(): void;
  clearFailure(): void;
}

export const AccountAccessContext = createContext<AccountAccessClient | null>(null);
