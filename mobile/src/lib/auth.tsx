import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchResponses, fetchSession, logout as apiLogout, mobileLogin, restoreStoredToken } from '@/lib/api';

type Summary = {
  total: number;
  unreadTotal: number;
  bySource: Record<string, number>;
  unreadBySource: Record<string, number>;
};

type AuthState = {
  checked: boolean;
  authenticated: boolean;
  user: null | { id: string; username: string; role: string };
  loading: boolean;
};

const defaultSummary: Summary = {
  total: 0,
  unreadTotal: 0,
  bySource: {},
  unreadBySource: {},
};

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [authState, setAuthState] = useState<AuthState>({
    checked: false,
    authenticated: false,
    user: null,
    loading: true,
  });
  const [responsesSummary, setResponsesSummary] = useState<Summary>(defaultSummary);
  const [authLoading, setAuthLoading] = useState(false);

  const bootstrap = useCallback(async () => {
    try {
      const token = await restoreStoredToken();

      if (!token) {
        setAuthState({ checked: true, authenticated: false, user: null, loading: false });
        setResponsesSummary(defaultSummary);
        return;
      }

      const payload = await fetchSession();
      setAuthState({
        checked: true,
        authenticated: Boolean(payload.authenticated),
        user: payload.user || null,
        loading: false,
      });
    } catch {
      await apiLogout();
      setAuthState({ checked: true, authenticated: false, user: null, loading: false });
      setResponsesSummary(defaultSummary);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const refreshMessageSummary = useCallback(async (nextSummary?: Summary) => {
    if (nextSummary) {
      setResponsesSummary(nextSummary);
      return nextSummary;
    }

    if (!authState.authenticated) {
      setResponsesSummary(defaultSummary);
      return defaultSummary;
    }

    try {
      const payload = await fetchResponses({ limit: 200 });
      const summary = payload.summary || defaultSummary;
      setResponsesSummary(summary);
      return summary;
    } catch {
      setResponsesSummary(defaultSummary);
      return defaultSummary;
    }
  }, [authState.authenticated]);

  const login = useCallback(async (username: string, password: string) => {
    setAuthLoading(true);
    try {
      const payload = await mobileLogin(username, password);
      setAuthState({
        checked: true,
        authenticated: Boolean(payload.authenticated),
        user: payload.user || null,
        loading: false,
      });
      await refreshMessageSummary();
      return payload;
    } finally {
      setAuthLoading(false);
    }
  }, [refreshMessageSummary]);

  const logout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await apiLogout();
      setAuthState({ checked: true, authenticated: false, user: null, loading: false });
      setResponsesSummary(defaultSummary);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      authState,
      authLoading,
      responsesSummary,
      unreadCount: responsesSummary.unreadTotal || 0,
      login,
      logout,
      refreshMessageSummary,
    }),
    [authLoading, authState, login, logout, refreshMessageSummary, responsesSummary],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth precisa estar dentro de AuthProvider.');
  }

  return context;
}
