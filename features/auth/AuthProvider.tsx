import { type ReactNode } from 'react';

import { AuthContext } from './authContext';
import { useAuth } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
