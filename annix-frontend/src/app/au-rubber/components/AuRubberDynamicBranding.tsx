"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { DynamicFavicon, DynamicManifest, ManifestConfig } from "@/app/lib/branding";

function resolveLogoUrl(logoUrl: string | null): {
  proxyUrl: string | null;
  isExternal: boolean;
} {
  if (!logoUrl) return { proxyUrl: null, isExternal: false };
  const isExternal = logoUrl.startsWith("http://") || logoUrl.startsWith("https://");
  if (isExternal) {
    return { proxyUrl: auRubberApiClient.proxyImageUrl(logoUrl), isExternal: true };
  }
  return { proxyUrl: logoUrl, isExternal: false };
}

export function AuRubberDynamicBranding() {
  const { branding, colors } = useAuRubberBranding();
  const [logoBlobUrl, setLogoBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const { proxyUrl, isExternal } = resolveLogoUrl(branding.logoUrl);

  useEffect(() => {
    const controller = new AbortController();

    if (branding.logoUrl && proxyUrl) {
      const fetchOptions: RequestInit = { signal: controller.signal };
      if (isExternal) {
        fetchOptions.headers = auRubberApiClient.authHeaders();
      }

      fetch(proxyUrl, fetchOptions)
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (!controller.signal.aborted && blob) {
            if (blobUrlRef.current) {
              URL.revokeObjectURL(blobUrlRef.current);
            }
            const url = URL.createObjectURL(blob);
            blobUrlRef.current = url;
            setLogoBlobUrl(url);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setLogoBlobUrl(null);
          }
        });
    } else {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setLogoBlobUrl(null);
    }

    return () => {
      controller.abort();
    };
  }, [branding.logoUrl, proxyUrl, isExternal]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const manifestIconUrl = proxyUrl || "/images/annix-icon.png";

  const manifestConfig: ManifestConfig = useMemo(
    () => ({
      name: "AU Rubber Portal",
      shortName: "AU Rubber",
      startUrl: "/au-rubber/portal",
      scope: "/au-rubber",
      themeColor: colors.background,
      backgroundColor: "#f9fafb",
      iconUrls: {
        size192: manifestIconUrl,
        size512: manifestIconUrl,
      },
    }),
    [manifestIconUrl, colors.background],
  );

  return (
    <>
      <DynamicManifest manifestConfig={manifestConfig} />
      <DynamicFavicon iconUrl={logoBlobUrl} fallbackIconUrl="/images/annix-icon.png" />
    </>
  );
}
