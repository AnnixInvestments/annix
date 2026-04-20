"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import {
  StockControlUser,
  StockControlUserProfile,
  stockControlApiClient,
} from "@/app/lib/api/stockControlApi";

interface OpsAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: StockControlUser | null;
  profile: StockControlUserProfile | null;
}

interface OpsAuthContextType extends OpsAuthState {
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const OpsAuthContext = createContext<OpsAuthContextType | undefined>(undefined);

export function OpsAuthProvider(props: { children: ReactNode }) {
  const { children } = props;
  const [state, setState] = useState<OpsAuthState>({
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
    } catch {
      stockControlApiClient.clearTokens();
      setState({
        isAuthenticated: false,
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
      // silent fail - profile refresh is not critical
    }
  };

  return (
    <OpsAuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </OpsAuthContext.Provider>
  );
}

export function useOpsAuth() {
  const context = useContext(OpsAuthContext);
  if (context === undefined) {
    throw new Error("useOpsAuth must be used within an OpsAuthProvider");
  }
  return context;
}
