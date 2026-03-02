"use client";

import { useMemo } from "react";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { DynamicFavicon, DynamicManifest, ManifestConfig } from "@/app/lib/branding";

export function AuRubberDynamicBranding() {
  const { branding, colors } = useAuRubberBranding();

  const cacheBuster = branding.updatedAt ? `?v=${branding.updatedAt}` : "";
  const logoUrlWithCache = branding.logoUrl ? `${branding.logoUrl}${cacheBuster}` : null;

  const manifestConfig: ManifestConfig = useMemo(
    () => ({
      name: "AU Rubber Portal",
      shortName: "AU Rubber",
      startUrl: "/au-rubber/portal",
      scope: "/au-rubber",
      themeColor: colors.background,
      backgroundColor: "#f9fafb",
      iconUrls: {
        size192: logoUrlWithCache || "/images/annix-icon.png",
        size512: logoUrlWithCache || "/images/annix-icon.png",
      },
    }),
    [logoUrlWithCache, colors.background],
  );

  return (
    <>
      <DynamicManifest manifestConfig={manifestConfig} />
      <DynamicFavicon iconUrl={logoUrlWithCache} fallbackIconUrl="/images/annix-icon.png" />
    </>
  );
}
