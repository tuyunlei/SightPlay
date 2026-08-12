import { useContext } from 'react';

import { IdentityContext, type IdentityClient } from './contexts/IdentityContext';

export function useIdentity(): IdentityClient {
  const identity = useContext(IdentityContext);
  if (!identity) throw new Error('useIdentity must be used within IdentityProvider');
  return identity;
}
