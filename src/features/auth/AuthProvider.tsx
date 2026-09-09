import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AuthApi, authApi } from './auth-api';
import type { AuthUser, ProviderCapability } from './auth.types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  api: AuthApi;
  status: AuthStatus;
  user: AuthUser | null;
  providers: ProviderCapability[];
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, api = authApi }: { children: ReactNode; api?: AuthApi }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [providers, setProviders] = useState<ProviderCapability[]>([]);
  const bootstrapRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!bootstrapRef.current) {
      bootstrapRef.current = Promise.all([
        api.bootstrap(),
        api.getProviders().catch(() => ({ providers: [] })),
      ]).then(([nextUser, capability]) => {
        setUser(nextUser);
        setStatus(nextUser ? 'authenticated' : 'unauthenticated');
        setProviders(capability.providers);
      });
    }
  }, [api]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const session = await api.login(input);
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, [api]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, [api]);

  const refresh = useCallback(async () => {
    try {
      const session = await api.refreshAccess();
      setUser(session.user);
      setStatus('authenticated');
      return session.user;
    } catch (error) {
      setUser(null);
      setStatus('unauthenticated');
      throw error;
    }
  }, [api]);

  const value = useMemo(
    () => ({ api, status, user, providers, login, logout, refresh }),
    [api, status, user, providers, login, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
