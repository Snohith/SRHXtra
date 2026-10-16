"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffUser } from "@srh/contracts";
import { ApiError, api, clearAuth, getStoredAuth, storeAuth } from "./api";

interface AuthState {
  token: string | null;
  me: StaffUser | null;
  loading: boolean;
  signIn: (token: string, userId: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const stored = getStoredAuth();
    if (!stored.token) {
      setToken(null);
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const user = await api.me();
      setToken(stored.token);
      setMe(user);
    } catch {
      clearAuth();
      setToken(null);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (nextToken: string, userId: string) => {
    storeAuth(nextToken.trim(), userId.trim());
    try {
      const user = await api.me();
      setToken(nextToken.trim());
      setMe(user);
    } catch (err) {
      clearAuth();
      if (err instanceof ApiError) {
        throw new Error(err.status === 401 ? "Invalid token or unknown staff user." : err.message);
      }
      throw new Error("Could not reach the API. Is it running?");
    }
  }, []);

  const signOut = useCallback(() => {
    clearAuth();
    setToken(null);
    setMe(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ token, me, loading, signIn, signOut, refresh }),
    [token, me, loading, signIn, signOut, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider.");
  return ctx;
}

/** Render children only when signed in; otherwise redirect to /login. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !token) router.replace("/login");
  }, [loading, token, router]);
  if (loading) return <p className="muted">Loading…</p>;
  if (!token) return null;
  return <>{children}</>;
}

/** Staff roles allowed to publish (mirrors the API guard). */
export function canPublish(me: StaffUser | null): boolean {
  if (!me) return false;
  return me.roles.some((r) => r === "admin" || r === "editor" || r === "publisher");
}
