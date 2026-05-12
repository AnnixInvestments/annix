"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { type InsightsLoginInput, type InsightsUser, insightsApi } from "@/app/lib/api/insightsApi";
import { insightsTokenStore } from "@/app/lib/api/portalTokenStores";

interface AuthState {
  user: InsightsUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: InsightsLoginInput) => Promise<void>;
  logout: () => void;
}

const InsightsAuthContext = createContext<AuthState | null>(null);

export function InsightsAuthProvider(props: { children: ReactNode }) {
  const [user, setUser] = useState<InsightsUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const existing = insightsApi.currentUser();
    setUser(existing);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (input: InsightsLoginInput) => {
    await insightsApi.login(input);
    const decoded = insightsApi.currentUser();
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    insightsTokenStore.clear();
    setUser(null);
  }, []);

  return (
    <InsightsAuthContext.Provider
      value={{ user, isLoading, isAuthenticated: user !== null, login, logout }}
    >
      {props.children}
    </InsightsAuthContext.Provider>
  );
}

export function useInsightsAuth(): AuthState {
  const ctx = useContext(InsightsAuthContext);
  if (!ctx) {
    throw new Error("useInsightsAuth must be used inside InsightsAuthProvider");
  }
  return ctx;
}
