"use client";

import { useTheme } from "@/app/components/ThemeProvider";
import { brandHasAsset, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";

export function CoreBrandHeader() {
  const { resolvedTheme } = useTheme();
  const brandingData = useBranding("annix-core").data;
  const branding = brandingData ?? null;
  const variant = resolvedTheme === "light" ? "light" : "dark";

  const hasLockup = branding ? brandHasAsset("logoLockup", branding, variant) : false;
  const lockupUrl =
    branding && hasLockup ? resolveBrandAssetUrl("logoLockup", branding, variant) : null;

  if (lockupUrl) {
    return (
      <img
        src={lockupUrl}
        alt="Annix Core"
        className="mx-auto h-14 w-auto object-contain sm:h-16"
      />
    );
  }

  return <h1 className="text-4xl font-bold sm:text-5xl">Annix Core</h1>;
}
