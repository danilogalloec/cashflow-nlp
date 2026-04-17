'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api, registerRefreshCallback } from '@/lib/api';
import type { UserOut } from '@/lib/types';

interface AuthContextValue {
  token: string | null;
  user: UserOut | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const KEYS = { access: 'cf_access', refresh: 'cf_refresh' } as const;
const COOKIE = 'cf_logged_in=1; path=/; SameSite=Strict; max-age=604800';
const COOKIE_CLEAR = 'cf_logged_in=; path=/; SameSite=Strict; max-age=0';

function setSessionCookie() { document.cookie = COOKIE; }
function clearSessionCookie() { document.cookie = COOKIE_CLEAR; }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(KEYS.access);
    if (!stored) { setIsLoading(false); return; }

    api.auth.me(stored)
      .then(u => { setToken(stored); setUser(u); setSessionCookie(); })
      .catch(async () => {
        const rt = localStorage.getItem(KEYS.refresh);
        if (!rt) { localStorage.removeItem(KEYS.access); clearSessionCookie(); return; }
        try {
          const pair = await api.auth.refresh(rt);
          localStorage.setItem(KEYS.access, pair.access_token);
          localStorage.setItem(KEYS.refresh, pair.refresh_token);
          const u = await api.auth.me(pair.access_token);
          setToken(pair.access_token);
          setUser(u);
          setSessionCookie();
        } catch {
          localStorage.removeItem(KEYS.access);
          localStorage.removeItem(KEYS.refresh);
          clearSessionCookie();
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Register the refresh callback once so api.ts can silently refresh
  // mid-session when any request receives a 401.
  useEffect(() => {
    registerRefreshCallback(async () => {
      const rt = localStorage.getItem(KEYS.refresh);
      if (!rt) return null;
      try {
        const pair = await api.auth.refresh(rt);
        localStorage.setItem(KEYS.access, pair.access_token);
        localStorage.setItem(KEYS.refresh, pair.refresh_token);
        setToken(pair.access_token);
        return pair.access_token;
      } catch {
        localStorage.removeItem(KEYS.access);
        localStorage.removeItem(KEYS.refresh);
        clearSessionCookie();
        setToken(null);
        setUser(null);
        return null;
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const pair = await api.auth.login({ email, password });
    localStorage.setItem(KEYS.access, pair.access_token);
    localStorage.setItem(KEYS.refresh, pair.refresh_token);
    const u = await api.auth.me(pair.access_token);
    setToken(pair.access_token);
    setUser(u);
    setSessionCookie();
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const u = await api.auth.me(token);
    setUser(u);
  }, [token]);

  const logout = useCallback(async () => {
    const rt = localStorage.getItem(KEYS.refresh);
    if (rt) await api.auth.logout(rt).catch(() => {});
    localStorage.removeItem(KEYS.access);
    localStorage.removeItem(KEYS.refresh);
    clearSessionCookie();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, isLoading, login, logout, refreshUser }),
    [token, user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
