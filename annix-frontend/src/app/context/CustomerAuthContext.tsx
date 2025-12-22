'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { customerApiClient, CustomerAuthResponse, CustomerProfileResponse } from '@/app/lib/api/customerApi';

interface CustomerAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  customer: CustomerAuthResponse['customer'] | null;
  profile: CustomerProfileResponse | null;
}

interface CustomerAuthContextType extends CustomerAuthState {
  login: (email: string, password: string, deviceFingerprint: string, browserInfo?: Record<string, any>) => Promise<void>;
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

    try {
      const profile = await customerApiClient.getProfile();
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
    } catch {
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
    browserInfo?: Record<string, any>
  ) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
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
        customer: response.customer,
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
    } catch {
      // Silent fail - profile refresh is not critical
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
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
