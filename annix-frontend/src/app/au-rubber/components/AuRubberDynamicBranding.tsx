"use client";

import { useMemo } from "react";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { DynamicFavicon, DynamicManifest, ManifestConfig } from "@/app/lib/branding";

export function AuRubberDynamicBranding() {
  const { branding, colors } = useAuRubberBranding();

  const manifestConfig: ManifestConfig = useMemo(
    () => ({
      name: "AU Rubber Portal",
      shortName: "AU Rubber",
      startUrl: "/au-rubber/portal",
      scope: "/au-rubber",
      themeColor: colors.background,
      backgroundColor: "#f9fafb",
      iconUrls: {
        size192: branding.logoUrl || "/images/annix-icon.png",
        size512: branding.logoUrl || "/images/annix-icon.png",
      },
    }),
    [branding.logoUrl, colors.background],
  );

  return (
    <>
      <DynamicManifest manifestConfig={manifestConfig} />
      <DynamicFavicon iconUrl={branding.logoUrl} fallbackIconUrl="/images/annix-icon.png" />
    </>
  );
}
