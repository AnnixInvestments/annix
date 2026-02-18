"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  AnnixRepAuthResponse,
  AnnixRepAuthUser,
  AnnixRepLoginDto,
  AnnixRepRegisterDto,
  annixRepAuthApi,
} from "../lib/api/annixRepAuthApi";

interface AnnixRepAuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AnnixRepAuthUser | null;
  login: (dto: AnnixRepLoginDto) => Promise<AnnixRepAuthResponse>;
  register: (dto: AnnixRepRegisterDto) => Promise<AnnixRepAuthResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AnnixRepAuthContext = createContext<AnnixRepAuthContextValue | null>(null);

export function AnnixRepAuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AnnixRepAuthUser | null>(null);

  const isAuthenticated = !!user;

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await annixRepAuthApi.profile();
      setUser({
        userId: profile.userId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        setupCompleted: profile.setupCompleted,
      });
    } catch {
      const refreshed = await annixRepAuthApi.refresh();
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
      if (!annixRepAuthApi.isAuthenticated()) {
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

  const login = useCallback(async (dto: AnnixRepLoginDto): Promise<AnnixRepAuthResponse> => {
    const response = await annixRepAuthApi.login(dto);
    setUser({
      userId: response.userId,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      setupCompleted: response.setupCompleted ?? false,
    });
    return response;
  }, []);

  const register = useCallback(async (dto: AnnixRepRegisterDto): Promise<AnnixRepAuthResponse> => {
    const response = await annixRepAuthApi.register(dto);
    setUser({
      userId: response.userId,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      setupCompleted: response.setupCompleted ?? false,
    });
    return response;
  }, []);

  const logout = useCallback(async () => {
    await annixRepAuthApi.logout();
    setUser(null);
  }, []);

  return (
    <AnnixRepAuthContext.Provider
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
    </AnnixRepAuthContext.Provider>
  );
}

export function useAnnixRepAuth() {
  const context = useContext(AnnixRepAuthContext);
  if (!context) {
    throw new Error("useAnnixRepAuth must be used within a AnnixRepAuthProvider");
  }
  return context;
}
