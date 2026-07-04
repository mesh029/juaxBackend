"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ApiUser } from "@/lib/api/types";
import {
  api,
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
} from "@/lib/api/client";

type AuthContextValue = {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, code: string, name?: string) => Promise<void>;
  sendOtp: (phone: string) => Promise<string | undefined>;
  logout: () => void;
  isAdmin: boolean;
  isAgent: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      api.me(storedToken).catch(() => {
        clearStoredAuth();
        setToken(null);
        setUser(null);
      });
    }
    setLoading(false);
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    const res = await api.sendOtp(phone);
    return res.devCode;
  }, []);

  const login = useCallback(async (phone: string, code: string, name?: string) => {
    const res = await api.verifyOtp(phone, code, name);
    setStoredAuth(res.token, res.user);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      sendOtp,
      logout,
      isAdmin: user?.role === "admin",
      isAgent: user?.role === "agent" || user?.role === "admin",
    }),
    [user, token, loading, login, sendOtp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
