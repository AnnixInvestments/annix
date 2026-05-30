"use client";

import { createContext, useContext, useEffect } from "react";
import { useTheme } from "@/app/components/ThemeProvider";
import { useBranding } from "@/app/lib/query/hooks";
import { type Branding, brandingCssVars, brandingFallback, googleFontsHref } from "./branding";

const BrandingContext = createContext<Branding | null>(null);

export function useBrandingContext(): Branding | null {
  return useContext(BrandingContext);
}

function useBrandFonts(branding: Branding) {
  const href = googleFontsHref(branding);
  const brandCode = branding.brandCode;
  useEffect(() => {
    if (!href) return;
    const id = `brand-fonts-${brandCode}`;
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    if (existing) {
      if (existing.href !== href) existing.href = href;
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [href, brandCode]);
}

/**
 * Applies a brand's DB-driven theming. Sets `--brand-*` CSS variables on a
 * wrapper and (when `surface`, the default) paints the gradient + watermark so
 * the app's pages inherit them — the same treatment Annix Orbit uses. Pass
 * `surface={false}` to expose the variables without repainting the background
 * (useful where an app keeps its own backgrounds).
 */
export function BrandingProvider(props: {
  brand: string;
  children: React.ReactNode;
  surface?: boolean;
}) {
  const { brand, children } = props;
  const withSurface = props.surface !== false;
  const query = useBranding(brand);
  const data = query.data;
  const branding = data || brandingFallback(brand);
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "light" ? "light" : "dark";
  const cssVars = brandingCssVars(branding, mode);
  useBrandFonts(branding);

  if (!withSurface) {
    return (
      <BrandingContext.Provider value={branding}>
        <div style={cssVars as React.CSSProperties}>{children}</div>
      </BrandingContext.Provider>
    );
  }

  const surfaceStyle = {
    ...cssVars,
    backgroundImage:
      "linear-gradient(to bottom right, var(--brand-grad-from), var(--brand-grad-via), var(--brand-grad-to))",
  } as React.CSSProperties;

  return (
    <BrandingContext.Provider value={branding}>
      <div className="relative min-h-screen" style={surfaceStyle}>
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage: "var(--brand-page-background-image)",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center bottom",
            backgroundSize: "cover",
            backgroundAttachment: "fixed",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage: "var(--brand-watermark-image)",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "var(--brand-watermark-size)",
            opacity: "var(--brand-watermark-opacity)",
          }}
        />
        <div className="relative z-10 min-h-screen">{children}</div>
      </div>
    </BrandingContext.Provider>
  );
}
