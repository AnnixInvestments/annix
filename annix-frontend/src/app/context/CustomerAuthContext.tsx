"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { CustomerProfileResponse, customerApiClient } from "@/app/lib/api/customerApi";
import { log } from "@/app/lib/logger";

interface CustomerInfo {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  accountStatus: string;
}

interface CustomerAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  customer: CustomerInfo | null;
  profile: CustomerProfileResponse | null;
}

interface CustomerAuthContextType extends CustomerAuthState {
  login: (
    email: string,
    password: string,
    deviceFingerprint: string,
    browserInfo?: Record<string, any>,
    rememberMe?: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CustomerAuthState>({
    isAuthenticated: false,
    isLoading: true,
    customer: null,
    profile: null,
  });

  const checkAuth = useCallback(async () => {
    if (!customerApiClient.isAuthenticated()) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        customer: null,
        profile: null,
      });
      return;
    }

    const setAuthenticatedWithProfile = (profile: CustomerProfileResponse) => {
      setState({
        isAuthenticated: true,
        isLoading: false,
        customer: {
          id: profile.id,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          companyName: profile.company.tradingName || profile.company.legalName,
          accountStatus: profile.accountStatus,
        },
        profile,
      });
    };

    try {
      const profile = await customerApiClient.getProfile();
      setAuthenticatedWithProfile(profile);
    } catch (error) {
      // Profile fetch failed - try refreshing the token before giving up
      log.debug("[CustomerAuth] Profile fetch failed, attempting token refresh...");
      const refreshed = await customerApiClient.refreshAccessToken();

      if (refreshed) {
        // Token refreshed successfully - retry profile fetch
        try {
          const profile = await customerApiClient.getProfile();
          setAuthenticatedWithProfile(profile);
          return;
        } catch {
          // Still failed after refresh - clear tokens
          log.debug("[CustomerAuth] Profile fetch failed even after token refresh");
        }
      } else {
        log.debug("[CustomerAuth] Token refresh failed");
      }

      // Both attempts failed - user is not authenticated
      customerApiClient.clearTokens();
      setState({
        isAuthenticated: false,
        isLoading: false,
        customer: null,
        profile: null,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (
    email: string,
    password: string,
    deviceFingerprint: string,
    browserInfo?: Record<string, any>,
    rememberMe?: boolean,
  ) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      customerApiClient.setRememberMe(rememberMe ?? true);
      const response = await customerApiClient.login({
        email,
        password,
        deviceFingerprint,
        browserInfo,
      });

      const profile = await customerApiClient.getProfile();

      setState({
        isAuthenticated: true,
        isLoading: false,
        customer: {
          id: profile.id,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          companyName:
            profile.company?.tradingName || profile.company?.legalName || response.companyName,
          accountStatus: profile.accountStatus,
        },
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
      await customerApiClient.logout();
    } finally {
      setState({
        isAuthenticated: false,
        isLoading: false,
        customer: null,
        profile: null,
      });
    }
  };

  const refreshProfile = async () => {
    if (!customerApiClient.isAuthenticated()) return;

    try {
      const profile = await customerApiClient.getProfile();
      setState((prev) => ({
        ...prev,
        customer: prev.customer
          ? {
              ...prev.customer,
              firstName: profile.firstName,
              lastName: profile.lastName,
            }
          : null,
        profile,
      }));
    } catch (error) {
      log.debug("[CustomerAuth] Profile refresh failed (non-critical)", error);
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  }
  return context;
}

/**
 * Optional version of useCustomerAuth that returns a safe default
 * when used outside of CustomerAuthProvider (e.g., in admin portal).
 * Use this in components that may be rendered in non-customer contexts.
 */
export function useOptionalCustomerAuth(): CustomerAuthContextType {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    // Return a safe default state for non-customer contexts
    return {
      isAuthenticated: false,
      isLoading: false,
      customer: null,
      profile: null,
      login: async () => {
        throw new Error("Customer login not available in this context");
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
