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

type OtpSendResult = {
  devCode?: string;
  devMode: boolean;
};

type AuthContextValue = {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (
    phone: string,
    code: string,
    mode: "signin" | "signup",
    opts?: { name?: string; county?: string },
  ) => Promise<void>;
  sendOtp: (phone: string, mode: "signin" | "signup") => Promise<OtpSendResult>;
  devLogin: (role: "admin" | "agent" | "user") => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isAgent: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const storedToken = getStoredToken();
    if (!storedToken) return;
    const res = await api.me(storedToken);
    setUser(res.user);
    setStoredAuth(storedToken, res.user);
  }, []);

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

  const sendOtp = useCallback(async (phone: string, mode: "signin" | "signup") => {
    const res =
      mode === "signup" ? await api.signUpSend(phone) : await api.signInSend(phone);
    return {
      devCode: res.devCode,
      devMode: res.devMode ?? !!res.devCode,
    };
  }, []);

  const login = useCallback(
    async (
      phone: string,
      code: string,
      mode: "signin" | "signup",
      opts?: { name?: string; county?: string },
    ) => {
      const res =
        mode === "signup"
          ? await api.signUpVerify(phone, code, opts?.name ?? "", opts?.county)
          : await api.signInVerify(phone, code, opts?.name);
      setStoredAuth(res.token, res.user);
      setToken(res.token);
      setUser(res.user);
    },
    [],
  );

  const devLogin = useCallback(async (role: "admin" | "agent" | "user") => {
    const res = await api.devLogin(role);
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
      devLogin,
      logout,
      refreshUser,
      isAdmin: user?.role === "admin",
      isAgent: user?.role === "agent" || user?.role === "admin",
    }),
    [user, token, loading, login, sendOtp, devLogin, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
