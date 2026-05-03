"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { teacherAssistantTokenStore } from "@/app/lib/api/portalTokenStores";
import {
  type LoginTeacherInput,
  type RegisterTeacherInput,
  type TeacherAssistantUser,
  teacherAssistantApi,
} from "@/app/lib/api/teacherAssistantApi";

interface AuthState {
  user: TeacherAssistantUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginTeacherInput) => Promise<void>;
  register: (input: RegisterTeacherInput) => Promise<void>;
  logout: () => void;
}

const TeacherAssistantAuthContext = createContext<AuthState | null>(null);

export function TeacherAssistantAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TeacherAssistantUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = teacherAssistantTokenStore.accessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    teacherAssistantApi
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        teacherAssistantTokenStore.clear();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (input: LoginTeacherInput) => {
    const result = await teacherAssistantApi.login(input);
    teacherAssistantTokenStore.updateAccessToken(result.accessToken);
    setUser(result.user);
  }, []);

  const register = useCallback(async (input: RegisterTeacherInput) => {
    const result = await teacherAssistantApi.register(input);
    teacherAssistantTokenStore.updateAccessToken(result.accessToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    teacherAssistantTokenStore.clear();
    setUser(null);
  }, []);

  return (
    <TeacherAssistantAuthContext.Provider
      value={{ user, isLoading, isAuthenticated: user !== null, login, register, logout }}
    >
      {children}
    </TeacherAssistantAuthContext.Provider>
  );
}

export function useTeacherAssistantAuth(): AuthState {
  const ctx = useContext(TeacherAssistantAuthContext);
  if (!ctx) {
    throw new Error("useTeacherAssistantAuth must be used inside TeacherAssistantAuthProvider");
  }
  return ctx;
}
