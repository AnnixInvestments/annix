"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AdminUser, AdminUserProfile, adminApiClient } from "@/app/lib/api/adminApi";
import { ApiError } from "@/app/lib/api/apiError";
import { log } from "@/app/lib/logger";

const PROFILE_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];

interface AdminAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  admin: AdminUser | null;
  profile: AdminUserProfile | null;
}

interface AdminAuthContextType extends AdminAuthState {
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider(props: { children: ReactNode }) {
  const { children } = props;
  const [state, setState] = useState<AdminAuthState>({
    isAuthenticated: false,
    isLoading: true,
    admin: null,
    profile: null,
  });

  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetryTimer = useCallback(() => {
    const timer = retryTimer.current;
    if (timer) {
      clearTimeout(timer);
      retryTimer.current = null;
    }
  }, []);

  const checkAuth = useCallback(
    async (attempt: number = 0) => {
      clearRetryTimer();

      if (!adminApiClient.isAuthenticated()) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          admin: null,
          profile: null,
        });
        return;
      }

      try {
        const profile = await adminApiClient.getCurrentUser();
        setState({
          isAuthenticated: true,
          isLoading: false,
          admin: {
            id: profile.id,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            roles: profile.roles,
          },
          profile,
        });
      } catch (error) {
        // Only clear tokens on genuine 401/403 — network errors / 5xx
        // must NOT log the admin out, otherwise every backend restart
        // boots them to login (see CustomerAuthContext for the full fix
        // rationale).
        const isAuthFailure = error instanceof ApiError && error.isAuthFailure();
        if (isAuthFailure) {
          adminApiClient.clearTokens();
          setState({
            isAuthenticated: false,
            isLoading: false,
            admin: null,
            profile: null,
          });
          return;
        }
        // Transient backend blip (restart / network) — keep the session but
        // retry with backoff so the navbar self-heals instead of staying
        // blank until a manual refresh.
        log.warn("[AdminAuth] Profile fetch failed with non-auth error; keeping session", error);
        setState({
          isAuthenticated: true,
          isLoading: false,
          admin: null,
          profile: null,
        });
        const retryDelay = PROFILE_RETRY_DELAYS_MS[attempt];
        if (retryDelay) {
          retryTimer.current = setTimeout(() => {
            checkAuth(attempt + 1);
          }, retryDelay);
        }
      }
    },
    [clearRetryTimer],
  );

  useEffect(() => {
    checkAuth();
    return () => clearRetryTimer();
  }, [checkAuth, clearRetryTimer]);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      adminApiClient.setRememberMe(rememberMe);
      const response = await adminApiClient.login({ email, password });

      const profile = await adminApiClient.getCurrentUser();

      setState({
        isAuthenticated: true,
        isLoading: false,
        admin: response.user,
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
      await adminApiClient.logout();
    } finally {
      setState({
        isAuthenticated: false,
        isLoading: false,
        admin: null,
        profile: null,
      });
    }
  };

  const refreshProfile = async () => {
    if (!adminApiClient.isAuthenticated()) return;

    try {
      const profile = await adminApiClient.getCurrentUser();
      setState((prev) => ({
        ...prev,
        profile,
        admin: prev.admin
          ? {
              ...prev.admin,
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
    <AdminAuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}

export function useOptionalAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    return {
      isAuthenticated: false,
      isLoading: false,
      admin: null,
      profile: null,
      login: async () => {
        throw new Error("Admin login not available in this context");
      },
      logout: async () => {
        /* no-op */
      },
      refreshProfile: async () => {
        /* no-op */
      },
    };
  }
  return context;
}
