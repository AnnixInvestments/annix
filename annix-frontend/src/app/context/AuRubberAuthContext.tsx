"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import {
  AuRubberUser,
  AuRubberUserProfile,
  auRubberApiClient,
} from "@/app/lib/api/auRubberApi";

interface AuRubberAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuRubberUser | null;
  profile: AuRubberUserProfile | null;
  permissions: string[];
  roleCode: string | null;
  isAdmin: boolean;
}

interface AuRubberAuthContextType extends AuRubberAuthState {
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuRubberAuthContext = createContext<AuRubberAuthContextType | undefined>(undefined);

export function AuRubberAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuRubberAuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    profile: null,
    permissions: [],
    roleCode: null,
    isAdmin: false,
  });

  const checkAuth = useCallback(async () => {
    if (!auRubberApiClient.isAuthenticated()) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        profile: null,
        permissions: [],
        roleCode: null,
        isAdmin: false,
      });
      return;
    }

    try {
      const [profile, accessInfo] = await Promise.all([
        auRubberApiClient.currentUser(),
        auRubberApiClient.myAccess(),
      ]);
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
        permissions: accessInfo.permissions,
        roleCode: accessInfo.roleCode,
        isAdmin: accessInfo.isAdmin,
      });
    } catch {
      auRubberApiClient.clearTokens();
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        profile: null,
        permissions: [],
        roleCode: null,
        isAdmin: false,
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

      const [profile, accessInfo] = await Promise.all([
        auRubberApiClient.currentUser(),
        auRubberApiClient.myAccess(),
      ]);

      setState({
        isAuthenticated: true,
        isLoading: false,
        user: response.user,
        profile,
        permissions: accessInfo.permissions,
        roleCode: accessInfo.roleCode,
        isAdmin: accessInfo.isAdmin,
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
        permissions: [],
        roleCode: null,
        isAdmin: false,
      });
    }
  };

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return state.permissions.includes(permission);
    },
    [state.permissions],
  );

  const refreshProfile = async () => {
    if (!auRubberApiClient.isAuthenticated()) return;

    try {
      const [profile, accessInfo] = await Promise.all([
        auRubberApiClient.currentUser(),
        auRubberApiClient.myAccess(),
      ]);
      setState((prev) => ({
        ...prev,
        profile,
        permissions: accessInfo.permissions,
        roleCode: accessInfo.roleCode,
        isAdmin: accessInfo.isAdmin,
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
        hasPermission,
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
