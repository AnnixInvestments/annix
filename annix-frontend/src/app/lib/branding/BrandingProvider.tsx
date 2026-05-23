"use client";

import { createContext, useContext } from "react";
import { useBranding } from "@/app/lib/query/hooks";
import { type Branding, brandingCssVars, brandingFallback } from "./branding";

const BrandingContext = createContext<Branding | null>(null);

export function useBrandingContext(): Branding | null {
  return useContext(BrandingContext);
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
  const cssVars = brandingCssVars(branding);

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
