"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { AuRubberUser, AuRubberUserProfile, auRubberApiClient } from "@/app/lib/api/auRubberApi";

interface AuRubberAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuRubberUser | null;
  profile: AuRubberUserProfile | null;
}

interface AuRubberAuthContextType extends AuRubberAuthState {
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuRubberAuthContext = createContext<AuRubberAuthContextType | undefined>(undefined);

export function AuRubberAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuRubberAuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    profile: null,
  });

  const checkAuth = useCallback(async () => {
    if (!auRubberApiClient.isAuthenticated()) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        profile: null,
      });
      return;
    }

    try {
      const profile = await auRubberApiClient.currentUser();
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: profile.id,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          roles: profile.roles,
        },
        profile,
      });
    } catch {
      auRubberApiClient.clearTokens();
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
      auRubberApiClient.setRememberMe(rememberMe);
      const response = await auRubberApiClient.login({ email, password });

      const profile = await auRubberApiClient.currentUser();

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
      await auRubberApiClient.logout();
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
    if (!auRubberApiClient.isAuthenticated()) return;

    try {
      const profile = await auRubberApiClient.currentUser();
      setState((prev) => ({
        ...prev,
        profile,
        user: prev.user
          ? {
              ...prev.user,
              firstName: profile.firstName,
              lastName: profile.lastName,
              roles: profile.roles,
            }
          : null,
      }));
    } catch {
      // Silent fail - profile refresh is not critical
    }
  };

  return (
    <AuRubberAuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuRubberAuthContext.Provider>
  );
}

export function useAuRubberAuth() {
  const context = useContext(AuRubberAuthContext);
  if (context === undefined) {
    throw new Error("useAuRubberAuth must be used within an AuRubberAuthProvider");
  }
  return context;
}
