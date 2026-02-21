"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { VoiceFilterUser, voiceFilterApi } from "../lib/api/voiceFilterApi";

interface VoiceFilterAuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: VoiceFilterUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  oauthLogin: (provider: string) => void;
}

const VoiceFilterAuthContext = createContext<VoiceFilterAuthContextValue | null>(null);

export function VoiceFilterAuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<VoiceFilterUser | null>(null);

  const isAuthenticated = !!user;

  const refreshUser = useCallback(async () => {
    try {
      const userData = await voiceFilterApi.user();
      setUser(userData);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await refreshUser();
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const success = await voiceFilterApi.login(email, password);
    if (success) {
      const userData = await voiceFilterApi.user();
      setUser(userData);
    }
    return success;
  }, []);

  const register = useCallback(async (email: string, password: string): Promise<boolean> => {
    const success = await voiceFilterApi.register(email, password);
    if (success) {
      const userData = await voiceFilterApi.user();
      setUser(userData);
    }
    return success;
  }, []);

  const logout = useCallback(async () => {
    await voiceFilterApi.logout();
    setUser(null);
  }, []);

  const oauthLogin = useCallback((provider: string) => {
    window.location.href = voiceFilterApi.oauthUrl(provider);
  }, []);

  return (
    <VoiceFilterAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        register,
        logout,
        refreshUser,
        oauthLogin,
      }}
    >
      {children}
    </VoiceFilterAuthContext.Provider>
  );
}

export function useVoiceFilterAuth() {
  const context = useContext(VoiceFilterAuthContext);
  if (!context) {
    throw new Error("useVoiceFilterAuth must be used within a VoiceFilterAuthProvider");
  }
  return context;
}
