import { createContext } from 'react';

import { useAuth } from './useAuth';

export type AuthContextType = ReturnType<typeof useAuth>;

export const AuthContext = createContext<AuthContextType | null>(null);
