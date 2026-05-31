"use client";

import { brandHasAsset, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";
import AnnixLogo from "./AnnixLogo";

// Single source of truth for an app's navbar logo lockup, pulled live from the
// per-app branding page. Used by PortalToolbar and any surface that must match
// the app toolbar exactly (e.g. the extraction progress popup).
//
// Render order of preference:
//   1. textCrop (a pre-composed horizontal lockup) — icon + that single image.
//   2. wordmark + sub-mark stacked under it (icon left, ANNIX over APPNAME) —
//      navbar-sized so the wordmark never dwarfs the toolbar.
//   3. AnnixLogo fallback until any branding asset is available.
export function BrandNavLogo(props: { brand: string; isOrbit: boolean }) {
  const { brand, isOrbit } = props;
  const query = useBranding(brand);
  const data = query.data;
  const branding = data ?? null;
  const hasTextCrop = branding ? brandHasAsset("textCrop", branding) : false;
  const hasWordmark = branding ? brandHasAsset("wordmark", branding) : false;

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

  if (branding && hasWordmark) {
    const iconUrl = resolveBrandAssetUrl("logoIcon", branding);
    const wordmarkUrl = resolveBrandAssetUrl("wordmark", branding);
    const hasSubMark = brandHasAsset("subMark", branding);
    const subMarkUrl = hasSubMark ? resolveBrandAssetUrl("subMark", branding) : null;
    return (
      <span className="flex items-center gap-2.5">
        <img src={iconUrl} alt="" className="h-9 w-9 rounded-[18%] object-contain" />
        <span className="flex flex-col items-start justify-center leading-none">
          <img src={wordmarkUrl} alt="" className="h-5 w-auto max-w-[140px] object-contain" />
          {subMarkUrl ? (
            <img
              src={subMarkUrl}
              alt=""
              className="mt-1 h-2 w-auto max-w-[140px] object-contain object-left"
            />
          ) : null}
        </span>
      </span>
    );
  }

  return <AnnixLogo size="sm" showText={true} wordmark={isOrbit ? "orbit" : "investments"} />;
}
