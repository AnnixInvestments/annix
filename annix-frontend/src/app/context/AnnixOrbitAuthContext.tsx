"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import {
  AnnixOrbitUser,
  AnnixOrbitUserProfile,
  annixOrbitApiClient,
} from "@/app/lib/api/annixOrbitApi";
import { ApiError } from "@/app/lib/api/apiError";
import { log } from "@/app/lib/logger";

interface AnnixOrbitAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AnnixOrbitUser | null;
  profile: AnnixOrbitUserProfile | null;
}

interface AnnixOrbitAuthContextType extends AnnixOrbitAuthState {
  login: (email: string, password: string, rememberMe: boolean) => Promise<AnnixOrbitUserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AnnixOrbitAuthContext = createContext<AnnixOrbitAuthContextType | undefined>(undefined);

export function AnnixOrbitAuthProvider(props: { children: ReactNode }) {
  const { children } = props;
  const [state, setState] = useState<AnnixOrbitAuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    profile: null,
  });

  const checkAuth = useCallback(async () => {
    if (!annixOrbitApiClient.isAuthenticated()) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        profile: null,
      });
      return;
    }

    try {
      const profile = await annixOrbitApiClient.currentUser();
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          userType: profile.userType,
        },
        profile,
      });
    } catch (error) {
      // Only clear tokens on genuine 401/403 — see CustomerAuthContext
      // for the full network-error-tolerance rationale.
      const isAuthFailure = error instanceof ApiError && error.isAuthFailure();
      if (isAuthFailure) {
        annixOrbitApiClient.clearTokens();
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          profile: null,
        });
        return;
      }
      log.warn("[AnnixOrbitAuth] Profile fetch failed with non-auth error; keeping session", error);
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
      annixOrbitApiClient.setRememberMe(rememberMe);
      const response = await annixOrbitApiClient.login({ email, password });

      const profile = await annixOrbitApiClient.currentUser();

      setState({
        isAuthenticated: true,
        isLoading: false,
        user: response.user,
        profile,
      });

      return profile;
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await annixOrbitApiClient.logout();
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
    if (!annixOrbitApiClient.isAuthenticated()) return;

    try {
      const profile = await annixOrbitApiClient.currentUser();
      setState((prev) => ({
        ...prev,
        profile,
        user: prev.user
          ? {
              ...prev.user,
              name: profile.name,
              role: profile.role,
              userType: profile.userType,
            }
          : null,
      }));
    } catch {
      // Silent fail
    }
  };

  return (
    <AnnixOrbitAuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AnnixOrbitAuthContext.Provider>
  );
}

export function useAnnixOrbitAuth() {
  const context = useContext(AnnixOrbitAuthContext);
  if (context === undefined) {
    throw new Error("useAnnixOrbitAuth must be used within a AnnixOrbitAuthProvider");
  }
  return context;
}
