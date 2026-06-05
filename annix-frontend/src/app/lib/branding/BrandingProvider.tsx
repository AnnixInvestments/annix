"use client";

import { createContext, useContext, useEffect } from "react";
import { useTheme } from "@/app/components/ThemeProvider";
import { useBranding } from "@/app/lib/query/hooks";
import {
  type Branding,
  brandingCssVars,
  brandingFallback,
  googleFontsHref,
  resolveBrandAssetUrl,
} from "./branding";

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

  // Surface base follows the per-mode Main background colour so the light/dark
  // toggle actually flips the background (was always the dark gradient, which
  // kept every app dark even in light mode). The page-background image +
  // watermark layer on top of it, same as the global root background.
  const surfaceBackground = mode === "light" ? branding.backgroundLight : branding.backgroundDark;
  const surfaceStyle = {
    ...cssVars,
    backgroundColor: surfaceBackground,
  } as React.CSSProperties;

  const heroTopLight = branding.assets.heroTop;
  const heroTopDark = branding.assetsDark.heroTop;
  const hasHeroTop = mode === "light" ? heroTopLight || heroTopDark : heroTopDark || heroTopLight;
  const heroTopUrl = hasHeroTop ? resolveBrandAssetUrl("heroTop", branding, mode) : null;

  const heroBottomLight = branding.assets.heroBottom;
  const heroBottomDark = branding.assetsDark.heroBottom;
  const hasHeroBottom =
    mode === "light" ? heroBottomLight || heroBottomDark : heroBottomDark || heroBottomLight;
  const heroBottomUrl = hasHeroBottom ? resolveBrandAssetUrl("heroBottom", branding, mode) : null;
  const heroTopTransparentStop = 100 - branding.heroTopFadePct;
  const heroBottomTransparentStop = 100 - branding.heroBottomFadePct;

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
        {heroTopUrl ? (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-0 z-0 overflow-hidden"
            style={{
              height: `${branding.heroTopHeightPct}vh`,
              backgroundImage: `linear-gradient(to bottom, transparent ${heroTopTransparentStop}%, ${surfaceBackground}), url('${heroTopUrl}')`,
              backgroundRepeat: "no-repeat, no-repeat",
              backgroundPosition: "center top, center top",
              backgroundSize: "cover, cover",
            }}
          />
        ) : null}
        {heroBottomUrl ? (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-0 overflow-hidden"
            style={{
              height: `${branding.heroBottomHeightPct}vh`,
              backgroundImage: `linear-gradient(to top, transparent ${heroBottomTransparentStop}%, ${surfaceBackground}), url('${heroBottomUrl}')`,
              backgroundRepeat: "no-repeat, no-repeat",
              backgroundPosition: "center bottom, center bottom",
              backgroundSize: "cover, 100% 100%",
            }}
          />
        ) : null}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-16 bottom-0 z-0 flex items-center justify-center"
        >
          <div
            className="overflow-hidden rounded-[18%] bg-contain bg-center bg-no-repeat"
            style={{
              width: "var(--brand-watermark-size)",
              height: "var(--brand-watermark-size)",
              backgroundImage: "var(--brand-watermark-image)",
              opacity: "var(--brand-watermark-opacity)",
            }}
          />
        </div>
        <div className="relative z-10 min-h-screen">{children}</div>
      </div>
    </BrandingContext.Provider>
  );
}
