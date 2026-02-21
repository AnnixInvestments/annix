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

function customColors(primaryColor: string, accentColor: string): BrandingColors {
  return {
    background: primaryColor,
    text: "#FFFFFF",
    accent: accentColor,
    hover: primaryColor,
    active: primaryColor,
    sidebar: "#FFFFFF",
    sidebarText: "#1f2937",
    sidebarHover: "#f0fdfa",
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

  return (
    <StockControlBrandingContext.Provider value={{ colors, logoUrl }}>
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
