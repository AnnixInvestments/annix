'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { adminApiClient, AdminUser, AdminUserProfile } from '@/app/lib/api/adminApi';

interface AdminAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  admin: AdminUser | null;
  profile: AdminUserProfile | null;
}

interface AdminAuthContextType extends AdminAuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminAuthState>({
    isAuthenticated: false,
    isLoading: true,
    admin: null,
    profile: null,
  });

  const checkAuth = useCallback(async () => {
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
    } catch {
      adminApiClient.clearTokens();
      setState({
        isAuthenticated: false,
        isLoading: false,
        admin: null,
        profile: null,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
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
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
