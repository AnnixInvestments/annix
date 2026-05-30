"use client";

import { resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";
import { useTheme } from "./ThemeProvider";

const MASTER_BRAND = "annix-investments";
const LIGHT_BACKGROUND_FALLBACK = "#F8FAFC";
const DARK_BACKGROUND_FALLBACK = "#0F172A";

// A single fixed full-screen layer mounted once at the root. Paints the master
// Annix Investments per-mode background colour, then the locked page-background
// hero image on top (cover). Sits behind all content (-z-10) so every page that
// does not paint its own opaque surface inherits it automatically. App surfaces
// wrapped by BrandingProvider render their own effective page background instead.
export function GlobalBrandBackground() {
  const { resolvedTheme } = useTheme();
  const brandingQuery = useBranding(MASTER_BRAND);
  const brandingData = brandingQuery.data;
  const branding = brandingData ?? null;

  const isLight = resolvedTheme === "light";

  const lightBg = branding?.backgroundLight;
  const darkBg = branding?.backgroundDark;
  const backgroundColor = isLight
    ? lightBg || LIGHT_BACKGROUND_FALLBACK
    : darkBg || DARK_BACKGROUND_FALLBACK;

  const variant = isLight ? "light" : "dark";
  const hasImageLight = branding ? branding.assets.pageBackground : false;
  const hasImageDark = branding ? branding.assetsDark.pageBackground : false;
  const hasImage = isLight ? hasImageLight || hasImageDark : hasImageDark || hasImageLight;
  const imageUrl =
    branding && hasImage ? resolveBrandAssetUrl("pageBackground", branding, variant) : null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ backgroundColor }}
    >
      {imageUrl ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${imageUrl}')`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      ) : null}
    </div>
  );
}
