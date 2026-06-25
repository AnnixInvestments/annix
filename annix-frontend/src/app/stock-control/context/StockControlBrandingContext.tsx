"use client";

import { CSSProperties, createContext, ReactNode, useContext, useMemo } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { useBranding } from "@/app/lib/query/hooks";

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
  background: "#323288",
  text: "#FFFFFF",
  accent: "#FF8A00",
  hover: darkenHex("#323288", 0.25),
  active: darkenHex("#323288", 0.45),
  sidebar: "#FFFFFF",
  sidebarText: "#1f2937",
  sidebarHover: lightenHex("#323288", 0.92),
  sidebarActive: "#323288",
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

function globalColors(navbarColor: string, accentOrange: string): BrandingColors {
  return {
    background: navbarColor,
    text: "#FFFFFF",
    accent: accentOrange,
    hover: darkenHex(navbarColor, 0.25),
    active: darkenHex(navbarColor, 0.45),
    sidebar: "#FFFFFF",
    sidebarText: "#1f2937",
    sidebarHover: lightenHex(navbarColor, 0.92),
    sidebarActive: navbarColor,
  };
}

function brandingCssVars(colors: BrandingColors): CSSProperties {
  return {
    "--sc-primary": colors.background,
    "--sc-primary-hover": colors.hover,
    "--sc-primary-active": colors.active,
    "--sc-accent": colors.accent,
    "--sc-text-on-primary": colors.text,
    "--sc-primary-50": lightenHex(colors.background, 0.93),
    "--sc-primary-100": lightenHex(colors.background, 0.86),
    "--sc-primary-200": lightenHex(colors.background, 0.72),
    "--sc-primary-300": lightenHex(colors.background, 0.55),
    "--sc-primary-400": lightenHex(colors.background, 0.32),
    "--sc-sidebar-hover": colors.sidebarHover,
  } as CSSProperties;
}

const StockControlBrandingContext = createContext<StockControlBrandingContextType | undefined>(
  undefined,
);

export function StockControlBrandingProvider(props: { children: ReactNode }) {
  const { children } = props;
  const { profile } = useStockControlAuth();
  const brandingQuery = useBranding("annix-core");
  const branding = brandingQuery.data;
  const rawLogoUrl = profile ? profile.logoUrl : null;
  const rawHeroImageUrl = profile ? profile.heroImageUrl : null;

  const brandingType = profile ? profile.brandingType : null;
  const primaryColor = profile ? profile.primaryColor : null;
  const accentColor = profile ? profile.accentColor : null;
  const navbarColor = branding ? branding.navbarColor : null;
  const accentOrange = branding ? branding.accentOrange : null;

  const colors = useMemo(() => {
    if (brandingType === "custom" && primaryColor && accentColor) {
      return customColors(primaryColor, accentColor);
    }
    if (navbarColor && accentOrange) {
      return globalColors(navbarColor, accentOrange);
    }
    return DEFAULT_COLORS;
  }, [brandingType, primaryColor, accentColor, navbarColor, accentOrange]);

  const cssVars = useMemo(() => brandingCssVars(colors), [colors]);

  const logoUrl = brandingType === "custom" ? rawLogoUrl || null : null;
  const heroImageUrl = brandingType === "custom" ? rawHeroImageUrl || null : null;

  return (
    <StockControlBrandingContext.Provider value={{ colors, logoUrl, heroImageUrl }}>
      <div style={cssVars} className="contents">
        {children}
      </div>
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
