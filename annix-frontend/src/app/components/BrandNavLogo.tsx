"use client";

import { brandHasAsset, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";
import AmixLogo from "./AmixLogo";

// Single source of truth for an app's navbar logo lockup (icon + textCrop),
// pulled live from the per-app branding page. Used by PortalToolbar and any
// other surface that must match the app toolbar exactly (e.g. the extraction
// progress popup). Falls back to AmixLogo until branding/textCrop is available.
export function BrandNavLogo(props: { brand: string; isOrbit: boolean }) {
  const { brand, isOrbit } = props;
  const query = useBranding(brand);
  const data = query.data;
  const branding = data ?? null;
  const hasTextCrop = branding ? brandHasAsset("textCrop", branding) : false;

  if (branding && hasTextCrop) {
    const iconUrl = resolveBrandAssetUrl("logoIcon", branding);
    const textUrl = resolveBrandAssetUrl("textCrop", branding);
    return (
      <span className="flex items-center gap-2">
        <img src={iconUrl} alt="" className="h-9 w-9 rounded-[18%] object-contain" />
        <img src={textUrl} alt="" className="h-8 w-auto max-w-[180px] object-contain" />
      </span>
    );
  }

  return <AmixLogo size="sm" showText={true} wordmark={isOrbit ? "orbit" : "investments"} />;
}
