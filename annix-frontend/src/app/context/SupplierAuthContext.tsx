'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supplierApiClient, SupplierAuthResponse, SupplierDashboardResponse } from '@/app/lib/api/supplierApi';

interface SupplierAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  supplier: SupplierAuthResponse['supplier'] | null;
  dashboard: SupplierDashboardResponse | null;
}

interface SupplierAuthContextType extends SupplierAuthState {
  login: (email: string, password: string, deviceFingerprint: string, browserInfo?: Record<string, any>) => Promise<void>;
  logout: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

const SupplierAuthContext = createContext<SupplierAuthContextType | undefined>(undefined);

export function SupplierAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SupplierAuthState>({
    isAuthenticated: false,
    isLoading: true,
    supplier: null,
    dashboard: null,
  });

  const checkAuth = useCallback(async () => {
    if (!supplierApiClient.isAuthenticated()) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        supplier: null,
        dashboard: null,
      });
      return;
    }

    try {
      const dashboard = await supplierApiClient.getDashboard();
      setState({
        isAuthenticated: true,
        isLoading: false,
        supplier: {
          id: 0, // Will be fetched from profile
          email: dashboard.profile.email,
          firstName: dashboard.profile.firstName,
          lastName: dashboard.profile.lastName,
          companyName: dashboard.profile.companyName,
          accountStatus: 'active',
          onboardingStatus: dashboard.onboarding.status,
        },
        dashboard,
      });
    } catch {
      supplierApiClient.clearTokens();
      setState({
        isAuthenticated: false,
        isLoading: false,
        supplier: null,
        dashboard: null,
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
      const response = await supplierApiClient.login({
        email,
        password,
        deviceFingerprint,
        browserInfo,
      });

      const dashboard = await supplierApiClient.getDashboard();

      setState({
        isAuthenticated: true,
        isLoading: false,
        supplier: response.supplier,
        dashboard,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await supplierApiClient.logout();
    } finally {
      setState({
        isAuthenticated: false,
        isLoading: false,
        supplier: null,
        dashboard: null,
      });
    }
  };

  const refreshDashboard = async () => {
    if (!supplierApiClient.isAuthenticated()) return;

    try {
      const dashboard = await supplierApiClient.getDashboard();
      setState((prev) => ({
        ...prev,
        dashboard,
        supplier: prev.supplier
          ? {
              ...prev.supplier,
              onboardingStatus: dashboard.onboarding.status,
            }
          : null,
      }));
    } catch {
      // Silent fail - dashboard refresh is not critical
    }
  };

  return (
    <SupplierAuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshDashboard,
      }}
    >
      {children}
    </SupplierAuthContext.Provider>
  );
}

export function useSupplierAuth() {
  const context = useContext(SupplierAuthContext);
  if (context === undefined) {
    throw new Error('useSupplierAuth must be used within a SupplierAuthProvider');
  }
  return context;
}
