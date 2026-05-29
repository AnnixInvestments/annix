"use client";

import { brandHasAsset, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";
import AnnixLogo from "./AnnixLogo";
import { useTheme } from "./ThemeProvider";

// Composes the Annix Investments master lockup: orbital mark + stacked ANNIX
// wordmark over the app-title sub-mark, with the orange flash line beneath
// both. Pulled live from the per-brand branding page and follows the active
// theme (light → navy lockup, dark → white lockup). Falls back to the static
// AnnixLogo until the wordmark asset is available.
export function BrandNavLockup(props: { brand: string }) {
  const { brand } = props;
  const query = useBranding(brand);
  const data = query.data;
  const branding = data ?? null;
  const { resolvedTheme } = useTheme();
  const variant = resolvedTheme === "light" ? "light" : "dark";
  const hasWordmark = branding ? brandHasAsset("wordmark", branding, variant) : false;

  if (!branding || !hasWordmark) {
    return <AnnixLogo size="sm" showText={true} wordmark="investments" />;
  }

  const iconUrl = resolveBrandAssetUrl("logoIcon", branding, variant);
  const wordmarkUrl = resolveBrandAssetUrl("wordmark", branding, variant);
  const hasSubMark = brandHasAsset("subMark", branding, variant);
  const subMarkUrl = hasSubMark ? resolveBrandAssetUrl("subMark", branding, variant) : null;
  const hasFlash = brandHasAsset("flashLine", branding, variant);
  const flashUrl = hasFlash ? resolveBrandAssetUrl("flashLine", branding, variant) : null;

  return (
    <span className="flex items-center gap-2.5">
      <img src={iconUrl} alt="" className="h-9 w-9 rounded-[22%] object-contain" />
      <span className="flex flex-col items-start justify-center leading-none">
        <img src={wordmarkUrl} alt="Annix" className="h-5 w-auto max-w-[150px] object-contain" />
        {subMarkUrl ? (
          <img
            src={subMarkUrl}
            alt=""
            className="mt-1 h-2.5 w-auto max-w-[150px] object-contain object-left"
          />
        ) : null}
        {flashUrl ? (
          <img
            src={flashUrl}
            alt=""
            className="mt-0.5 h-1.5 w-full max-w-[150px] object-contain object-left"
          />
        ) : null}
      </span>
    </span>
  );
}
