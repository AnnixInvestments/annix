"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ApiError } from "@/app/lib/api/apiError";
import {
  StockControlUser,
  StockControlUserProfile,
  stockControlApiClient,
} from "@/app/lib/api/stockControlApi";
import { log } from "@/app/lib/logger";

interface StockControlAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: StockControlUser | null;
  profile: StockControlUserProfile | null;
}

interface StockControlAuthContextType extends StockControlAuthState {
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const StockControlAuthContext = createContext<StockControlAuthContextType | undefined>(undefined);

export function StockControlAuthProvider(props: { children: ReactNode }) {
  const { children } = props;
  const [state, setState] = useState<StockControlAuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    profile: null,
  });

  const checkAuth = useCallback(async () => {
    if (!stockControlApiClient.isAuthenticated()) {
      const adminToken =
        // eslint-disable-next-line no-restricted-syntax -- SSR guard
        typeof window !== "undefined"
          ? localStorage.getItem("adminAccessToken") || sessionStorage.getItem("adminAccessToken")
          : null;

      if (adminToken) {
        try {
          await stockControlApiClient.adminBridge(adminToken);
        } catch {
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            profile: null,
          });
          return;
        }
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          profile: null,
        });
        return;
      }
    }

    try {
      const profile = await stockControlApiClient.currentUser();
      stockControlApiClient.setCompanyCookie(profile.companyId);
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
        },
        profile,
      });
    } catch (error) {
      // Only clear tokens on genuine 401/403 — see CustomerAuthContext
      // for the full network-error-tolerance rationale.
      const isAuthFailure = error instanceof ApiError && error.isAuthFailure();
      if (isAuthFailure) {
        stockControlApiClient.clearTokens();
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          profile: null,
        });
        return;
      }
      log.warn(
        "[StockControlAuth] Profile fetch failed with non-auth error; keeping session",
        error,
      );
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: null,
        profile: null,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      stockControlApiClient.setRememberMe(rememberMe);
      const response = await stockControlApiClient.login({ email, password });

      const profile = await stockControlApiClient.currentUser();
      stockControlApiClient.setCompanyCookie(profile.companyId);

      setState({
        isAuthenticated: true,
        isLoading: false,
        user: response.user,
        profile,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await stockControlApiClient.logout();
    } finally {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        profile: null,
      });
    }
  };

  const refreshProfile = async () => {
    if (!stockControlApiClient.isAuthenticated()) return;

    try {
      const profile = await stockControlApiClient.currentUser();
      setState((prev) => ({
        ...prev,
        profile,
        user: prev.user
          ? {
              ...prev.user,
              name: profile.name,
              role: profile.role,
            }
          : null,
      }));
    } catch {
      // Silent fail - profile refresh is not critical
    }
  };

  return (
    <StockControlAuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </StockControlAuthContext.Provider>
  );
}

export function useStockControlAuth() {
  const context = useContext(StockControlAuthContext);
  if (context === undefined) {
    throw new Error("useStockControlAuth must be used within a StockControlAuthProvider");
  }
  return context;
}
