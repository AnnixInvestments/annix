"use client";

import { brandHasAsset, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";
import { useTheme } from "./ThemeProvider";

const MASTER_BRAND = "annix-investments";

// The Annix Investments logo wording (ANNIX wordmark + INVESTMENTS sub-mark),
// pulled live from master branding. The hub header sits over the brand
// watermark, which shares the wordmark's per-mode colour and washes it out — so
// here we INVERT the variant (light theme → dark lockup, dark theme → light
// lockup) so the wording contrasts against the watermark behind it.
export function HubBrandWordmark() {
  const { resolvedTheme } = useTheme();
  const brandingQuery = useBranding(MASTER_BRAND);
  const brandingData = brandingQuery.data;
  const branding = brandingData ?? null;
  const variant = resolvedTheme === "light" ? "dark" : "light";

  const hasWordmark = branding ? brandHasAsset("wordmark", branding, variant) : false;

  if (!branding || !hasWordmark) {
    return (
      <span
        className="text-4xl md:text-5xl font-bold tracking-tight"
        style={{ color: "var(--foreground-inverted)" }}
      >
        ANNIX <span style={{ color: "#FF8A00" }}>INVESTMENTS</span>
      </span>
    );
  }

  const wordmarkUrl = resolveBrandAssetUrl("wordmark", branding, variant);
  const hasSubMark = brandHasAsset("subMark", branding, variant);
  const subMarkUrl = hasSubMark ? resolveBrandAssetUrl("subMark", branding, variant) : null;
  const hasFlash = brandHasAsset("flashLine", branding, variant);
  const flashUrl = hasFlash ? resolveBrandAssetUrl("flashLine", branding, variant) : null;

  return (
    <span className="flex flex-col items-center justify-center leading-none">
      <img
        src={wordmarkUrl}
        alt="Annix Investments"
        className="h-12 md:h-16 w-auto object-contain"
      />
      {subMarkUrl ? (
        <img src={subMarkUrl} alt="" className="mt-2 h-3 md:h-4 w-auto object-contain" />
      ) : null}
      {flashUrl ? (
        <img src={flashUrl} alt="" className="mt-1 h-2 w-auto max-w-[280px] object-contain" />
      ) : null}
    </span>
  );
}
