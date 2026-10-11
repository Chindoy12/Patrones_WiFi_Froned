import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import { setUnauthorizedHandler, tokenStore } from '../services/apiClient';
import type { AuthResponse, Role, User } from '../types';

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  can: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api.me().then(setUser).catch(logout).finally(() => setReady(true));
  }, [logout]);

  const start = useCallback((response: AuthResponse) => {
    tokenStore.set(response.token);
    setUser(response.user);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    start(await api.login(username, password));
  }, [start]);

  // A new account is signed in right away.
  const register = useCallback(async (username: string, password: string) => {
    start(await api.register(username, password));
  }, [start]);

  // UI hint only: the backend enforces the real authorization rules.
  const can = useCallback((...roles: Role[]) => !!user && roles.includes(user.role), [user]);

  const value = useMemo(() => ({ user, ready, login, register, logout, can }), [user, ready, login, register, logout, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
