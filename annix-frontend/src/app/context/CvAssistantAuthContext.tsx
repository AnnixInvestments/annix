"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import {
  CvAssistantUser,
  CvAssistantUserProfile,
  cvAssistantApiClient,
} from "@/app/lib/api/cvAssistantApi";

interface CvAssistantAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: CvAssistantUser | null;
  profile: CvAssistantUserProfile | null;
}

interface CvAssistantAuthContextType extends CvAssistantAuthState {
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const CvAssistantAuthContext = createContext<CvAssistantAuthContextType | undefined>(undefined);

export function CvAssistantAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CvAssistantAuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    profile: null,
  });

  const checkAuth = useCallback(async () => {
    if (!cvAssistantApiClient.isAuthenticated()) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        profile: null,
      });
      return;
    }

    try {
      const profile = await cvAssistantApiClient.currentUser();
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
      cvAssistantApiClient.clearTokens();
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
      cvAssistantApiClient.setRememberMe(rememberMe);
      const response = await cvAssistantApiClient.login({ email, password });

      const profile = await cvAssistantApiClient.currentUser();

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
      await cvAssistantApiClient.logout();
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
    if (!cvAssistantApiClient.isAuthenticated()) return;

    try {
      const profile = await cvAssistantApiClient.currentUser();
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
      // Silent fail
    }
  };

  return (
    <CvAssistantAuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </CvAssistantAuthContext.Provider>
  );
}

export function useCvAssistantAuth() {
  const context = useContext(CvAssistantAuthContext);
  if (context === undefined) {
    throw new Error("useCvAssistantAuth must be used within a CvAssistantAuthProvider");
  }
  return context;
}
