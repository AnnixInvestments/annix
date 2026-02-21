"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";

interface BrandingColors {
  background: string;
  text: string;
  accent: string;
  hover: string;
  active: string;
  sidebar: string;
  sidebarText: string;
  sidebarHover: string;
  sidebarActive: string;
}

interface StockControlBrandingContextType {
  colors: BrandingColors;
  logoUrl: string | null;
  heroImageUrl: string | null;
}

const DEFAULT_COLORS: BrandingColors = {
  background: "#0d9488",
  text: "#FFFFFF",
  accent: "#2dd4bf",
  hover: "#0f766e",
  active: "#115e59",
  sidebar: "#FFFFFF",
  sidebarText: "#1f2937",
  sidebarHover: "#f0fdfa",
  sidebarActive: "#0d9488",
};

function darkenHex(hex: string, amount: number): string {
  const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function lightenHex(hex: string, amount: number): string {
  const r = Math.min(
    255,
    Math.round(parseInt(hex.slice(1, 3), 16) + (255 - parseInt(hex.slice(1, 3), 16)) * amount),
  );
  const g = Math.min(
    255,
    Math.round(parseInt(hex.slice(3, 5), 16) + (255 - parseInt(hex.slice(3, 5), 16)) * amount),
  );
  const b = Math.min(
    255,
    Math.round(parseInt(hex.slice(5, 7), 16) + (255 - parseInt(hex.slice(5, 7), 16)) * amount),
  );
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function customColors(primaryColor: string, accentColor: string): BrandingColors {
  const darkBg = darkenHex(primaryColor, 0.55);
  return {
    background: darkBg,
    text: "#FFFFFF",
    accent: accentColor,
    hover: darkenHex(primaryColor, 0.65),
    active: darkenHex(primaryColor, 0.7),
    sidebar: "#FFFFFF",
    sidebarText: "#1f2937",
    sidebarHover: lightenHex(primaryColor, 0.92),
    sidebarActive: primaryColor,
  };
}

const StockControlBrandingContext = createContext<StockControlBrandingContextType | undefined>(
  undefined,
);

export function StockControlBrandingProvider({ children }: { children: ReactNode }) {
  const { profile } = useStockControlAuth();

  const colors = useMemo(() => {
    if (profile?.brandingType === "custom" && profile.primaryColor && profile.accentColor) {
      return customColors(profile.primaryColor, profile.accentColor);
    }
    return DEFAULT_COLORS;
  }, [profile?.brandingType, profile?.primaryColor, profile?.accentColor]);

  const logoUrl = profile?.brandingType === "custom" ? (profile.logoUrl ?? null) : null;
  const heroImageUrl = profile?.brandingType === "custom" ? (profile.heroImageUrl ?? null) : null;

  return (
    <StockControlBrandingContext.Provider value={{ colors, logoUrl, heroImageUrl }}>
      {children}
    </StockControlBrandingContext.Provider>
  );
}

export function useStockControlBranding() {
  const context = useContext(StockControlBrandingContext);
  if (context === undefined) {
    throw new Error("useStockControlBranding must be used within a StockControlBrandingProvider");
  }
  return context;
}
