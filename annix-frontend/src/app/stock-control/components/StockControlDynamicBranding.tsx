"use client";

import { useEffect } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { DynamicFavicon, DynamicManifest } from "@/app/lib/branding";

export function StockControlDynamicBranding() {
  const { profile } = useStockControlAuth();

  useEffect(() => {
    if (profile?.companyId && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({
          type: "SET_COMPANY_ID",
          data: { companyId: profile.companyId },
        });
      });
    }
  }, [profile?.companyId]);

  if (!profile?.companyId) {
    return null;
  }

  const cacheBuster = profile.companyUpdatedAt
    ? `?v=${new Date(profile.companyUpdatedAt).getTime()}`
    : "";
  const manifestUrl = `/api/stock-control/${profile.companyId}/manifest.json${cacheBuster}`;
  const hasCustomLogo = profile.brandingType === "custom" && !!profile.logoUrl;
  const iconUrl = hasCustomLogo
    ? `/api/stock-control/${profile.companyId}/icon/192${cacheBuster}`
    : null;

  return (
    <>
      <DynamicManifest manifestUrl={manifestUrl} />
      <DynamicFavicon iconUrl={iconUrl} fallbackIconUrl="/images/stock-control-icon-192.png" />
    </>
  );
}
