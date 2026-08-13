import { useContext } from 'react';

import { AccountAccessContext, type AccountAccessClient } from './AccountAccessContext';

export function useAccountAccess(): AccountAccessClient {
  const accountAccess = useContext(AccountAccessContext);
  if (!accountAccess) throw new Error('useAccountAccess must be used within AccountAccessProvider');
  return accountAccess;
}
