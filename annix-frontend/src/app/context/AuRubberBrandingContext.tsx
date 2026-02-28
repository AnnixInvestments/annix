"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { corpId } from "@/app/lib/corpId";

const STORAGE_KEY = "auRubberBranding";

export interface AuRubberBranding {
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  heroUrl: string | null;
}

interface AuRubberBrandingContextType {
  branding: AuRubberBranding;
  setBranding: (branding: Partial<AuRubberBranding>) => void;
  resetBranding: () => void;
  colors: {
    background: string;
    text: string;
    accent: string;
    hover: string;
    active: string;
    sidebar: string;
    sidebarText: string;
    sidebarHover: string;
    sidebarActive: string;
  };
}

const defaultBranding: AuRubberBranding = {
  primaryColor: corpId.colors.portal.auRubber.background,
  accentColor: corpId.colors.portal.auRubber.accent,
  logoUrl: null,
  heroUrl: null,
};

function lightenColor(hex: string, amount: number = 0.2): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));

  return `#${[lighten(r), lighten(g), lighten(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function darkenColor(hex: string, amount: number = 0.2): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const darken = (c: number) => Math.max(0, Math.round(c * (1 - amount)));

  return `#${[darken(r), darken(g), darken(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const AuRubberBrandingContext = createContext<AuRubberBrandingContextType | undefined>(undefined);

export function AuRubberBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<AuRubberBranding>(defaultBranding);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AuRubberBranding;
          setBrandingState({
            ...parsed,
            primaryColor: parsed.primaryColor?.trim() || defaultBranding.primaryColor,
            accentColor: parsed.accentColor?.trim() || defaultBranding.accentColor,
          });
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    }
  }, [branding, isLoaded]);

  const setBranding = useCallback((updates: Partial<AuRubberBranding>) => {
    setBrandingState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetBranding = useCallback(() => {
    setBrandingState(defaultBranding);
  }, []);

  const colors = useMemo(
    () => ({
      background: branding.primaryColor,
      text: "#FFFFFF",
      accent: branding.accentColor,
      hover: lightenColor(branding.primaryColor),
      active: darkenColor(branding.primaryColor),
      sidebar: "#FFFFFF",
      sidebarText: "#1f2937",
      sidebarHover: "#f3f4f6",
      sidebarActive: branding.accentColor,
    }),
    [branding.primaryColor, branding.accentColor],
  );

  const contextValue = useMemo(
    () => ({
      branding,
      setBranding,
      resetBranding,
      colors,
    }),
    [branding, setBranding, resetBranding, colors],
  );

  if (!isLoaded) {
    return null;
  }

  return (
    <AuRubberBrandingContext.Provider value={contextValue}>
      {children}
    </AuRubberBrandingContext.Provider>
  );
}

export function useAuRubberBranding() {
  const context = useContext(AuRubberBrandingContext);
  if (context === undefined) {
    throw new Error("useAuRubberBranding must be used within an AuRubberBrandingProvider");
  }
  return context;
}
