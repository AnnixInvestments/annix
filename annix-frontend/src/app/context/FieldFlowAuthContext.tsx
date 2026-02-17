"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  FieldFlowAuthResponse,
  FieldFlowAuthUser,
  FieldFlowLoginDto,
  FieldFlowRegisterDto,
  fieldflowAuthApi,
} from "../lib/api/fieldflowAuthApi";

interface FieldFlowAuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: FieldFlowAuthUser | null;
  login: (dto: FieldFlowLoginDto) => Promise<FieldFlowAuthResponse>;
  register: (dto: FieldFlowRegisterDto) => Promise<FieldFlowAuthResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const FieldFlowAuthContext = createContext<FieldFlowAuthContextValue | null>(null);

export function FieldFlowAuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<FieldFlowAuthUser | null>(null);

  const isAuthenticated = !!user;

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await fieldflowAuthApi.profile();
      setUser({
        userId: profile.userId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        setupCompleted: profile.setupCompleted,
      });
    } catch {
      const refreshed = await fieldflowAuthApi.refresh();
      if (refreshed) {
        setUser({
          userId: refreshed.userId,
          email: refreshed.email,
          firstName: refreshed.firstName,
          lastName: refreshed.lastName,
          setupCompleted: refreshed.setupCompleted ?? false,
        });
      } else {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (!fieldflowAuthApi.isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      try {
        await refreshProfile();
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshProfile]);

  const login = useCallback(async (dto: FieldFlowLoginDto): Promise<FieldFlowAuthResponse> => {
    const response = await fieldflowAuthApi.login(dto);
    setUser({
      userId: response.userId,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      setupCompleted: response.setupCompleted ?? false,
    });
    return response;
  }, []);

  const register = useCallback(
    async (dto: FieldFlowRegisterDto): Promise<FieldFlowAuthResponse> => {
      const response = await fieldflowAuthApi.register(dto);
      setUser({
        userId: response.userId,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        setupCompleted: response.setupCompleted ?? false,
      });
      return response;
    },
    [],
  );

  const logout = useCallback(async () => {
    await fieldflowAuthApi.logout();
    setUser(null);
  }, []);

  return (
    <FieldFlowAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </FieldFlowAuthContext.Provider>
  );
}

export function useFieldFlowAuth() {
  const context = useContext(FieldFlowAuthContext);
  if (!context) {
    throw new Error("useFieldFlowAuth must be used within a FieldFlowAuthProvider");
  }
  return context;
}
