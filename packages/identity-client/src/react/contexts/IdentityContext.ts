import { createContext } from 'react';

import type { IdentityView } from '../../model/selectors';
import type { IdentityState } from '../../model/types';

export interface IdentityClient {
  state: IdentityState;
  view: IdentityView;
  login(): void;
  register(input: { inviteCode: string; name?: string }): void;
  logout(): void;
  refreshSession(): void;
  clearFailure(): void;
}

export const IdentityContext = createContext<IdentityClient | null>(null);
