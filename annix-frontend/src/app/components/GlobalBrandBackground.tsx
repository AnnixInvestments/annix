"use client";

import { brandHasAsset, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";
import { useTheme } from "./ThemeProvider";

const MASTER_BRAND = "annix-investments";
const LIGHT_BACKGROUND_FALLBACK = "#0a1733";
const DARK_BACKGROUND_FALLBACK = "#0a1733";

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

  const heroTopLight = branding ? branding.assets.heroTop : false;
  const heroTopDark = branding ? branding.assetsDark.heroTop : false;
  const hasHeroTop = isLight ? heroTopLight || heroTopDark : heroTopDark || heroTopLight;
  const heroTopUrl =
    branding && hasHeroTop ? resolveBrandAssetUrl("heroTop", branding, variant) : null;
  const heroTopHeight = branding ? branding.heroTopHeightPct : 60;
  const heroTopFade = branding ? branding.heroTopFadePct : 45;
  const heroTopTransparentStop = 100 - heroTopFade;

  const heroBottomLight = branding ? branding.assets.heroBottom : false;
  const heroBottomDark = branding ? branding.assetsDark.heroBottom : false;
  const hasHeroBottom = isLight
    ? heroBottomLight || heroBottomDark
    : heroBottomDark || heroBottomLight;
  const heroBottomUrl =
    branding && hasHeroBottom ? resolveBrandAssetUrl("heroBottom", branding, variant) : null;
  const heroBottomHeight = branding ? branding.heroBottomHeightPct : 40;
  const heroBottomFade = branding ? branding.heroBottomFadePct : 45;
  const heroBottomTransparentStop = 100 - heroBottomFade;

  const hasWatermark = branding ? brandHasAsset("watermark", branding, variant) : false;
  const watermarkEnabled = branding ? branding.watermarkEnabled : false;
  const watermarkUrl =
    branding && watermarkEnabled && hasWatermark
      ? resolveBrandAssetUrl("watermark", branding, variant)
      : null;
  const watermarkOpacity = branding ? branding.watermarkOpacity : 0;
  const watermarkMaxSizePx = branding ? branding.watermarkMaxSizePx : 880;

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
            backgroundPosition: "center bottom",
            backgroundSize: "cover",
          }}
        />
      ) : null}
      {heroTopUrl ? (
        <div
          className="absolute inset-x-0 top-0 overflow-hidden"
          style={{
            height: `${heroTopHeight}vh`,
            backgroundImage: `linear-gradient(to bottom, transparent ${heroTopTransparentStop}%, ${backgroundColor}), url('${heroTopUrl}')`,
            backgroundRepeat: "no-repeat, no-repeat",
            backgroundPosition: "center top, center top",
            backgroundSize: "cover, cover",
          }}
        />
      ) : null}
      {heroBottomUrl ? (
        <div
          className="absolute inset-x-0 bottom-0 overflow-hidden"
          style={{
            height: `${heroBottomHeight}vh`,
            backgroundImage: `linear-gradient(to top, transparent ${heroBottomTransparentStop}%, ${backgroundColor}), url('${heroBottomUrl}')`,
            backgroundRepeat: "no-repeat, no-repeat",
            backgroundPosition: "center bottom, center bottom",
            backgroundSize: "cover, 100% 100%",
          }}
        />
      ) : null}
      {watermarkUrl ? (
        <div className="absolute inset-x-0 top-16 bottom-0 flex items-center justify-center">
          <div
            className="overflow-hidden rounded-[18%] bg-contain bg-center bg-no-repeat"
            style={{
              width: `min(70vmin, ${watermarkMaxSizePx}px)`,
              height: `min(70vmin, ${watermarkMaxSizePx}px)`,
              backgroundImage: `url('${watermarkUrl}')`,
              opacity: watermarkOpacity,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
