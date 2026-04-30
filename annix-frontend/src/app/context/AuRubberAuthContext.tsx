"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { isApiError } from "@/app/lib/api/apiError";
import { AuRubberUser, AuRubberUserProfile, auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { nowMillis } from "@/app/lib/datetime";

const AUTH_CACHE_KEY = "auRubberAuthCache";
const AUTH_CACHE_FRESH_MS = 60 * 1000;

interface AuRubberAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuRubberUser | null;
  profile: AuRubberUserProfile | null;
  permissions: string[];
  roleCode: string | null;
  isAdmin: boolean;
}

interface CachedAuthSnapshot {
  cachedAt: number;
  user: AuRubberUser | null;
  profile: AuRubberUserProfile | null;
  permissions: string[];
  roleCode: string | null;
  isAdmin: boolean;
}

function loadCachedAuth(): CachedAuthSnapshot | null {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedAuthSnapshot;
    const cachedAt = parsed.cachedAt;
    if (!cachedAt || nowMillis() - cachedAt > AUTH_CACHE_FRESH_MS) {
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(AUTH_CACHE_KEY);
    return null;
  }
}

function clearCachedAuth() {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_CACHE_KEY);
}

interface AuRubberAuthContextType extends AuRubberAuthState {
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuRubberAuthContext = createContext<AuRubberAuthContextType | undefined>(undefined);

export function AuRubberAuthProvider(props: { children: ReactNode }) {
  const { children } = props;
  const [state, setState] = useState<AuRubberAuthState>(() => {
    const cached = loadCachedAuth();
    if (cached) {
      return {
        isAuthenticated: true,
        isLoading: false,
        user: cached.user,
        profile: cached.profile,
        permissions: cached.permissions,
        roleCode: cached.roleCode,
        isAdmin: cached.isAdmin,
      };
    }
    return {
      isAuthenticated: false,
      isLoading: true,
      user: null,
      profile: null,
      permissions: [],
      roleCode: null,
      isAdmin: false,
    };
  });

  const checkAuth = useCallback(async () => {
    if (!auRubberApiClient.isAuthenticated()) {
      clearCachedAuth();
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
      const nextUser = {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        roles: profile.roles,
      };
      // eslint-disable-next-line no-restricted-syntax -- SSR guard
      if (typeof window !== "undefined") {
        const snapshot: CachedAuthSnapshot = {
          cachedAt: nowMillis(),
          user: nextUser,
          profile,
          permissions: accessInfo.permissions,
          roleCode: accessInfo.roleCode,
          isAdmin: accessInfo.isAdmin,
        };
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(snapshot));
      }
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: nextUser,
        profile,
        permissions: accessInfo.permissions,
        roleCode: accessInfo.roleCode,
        isAdmin: accessInfo.isAdmin,
      });
    } catch (err) {
      const isAuthFailure = isApiError(err) && (err.isUnauthorized() || err.isForbidden());
      if (isAuthFailure) {
        auRubberApiClient.clearTokens();
        clearCachedAuth();
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
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
      }));
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
      clearCachedAuth();
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
