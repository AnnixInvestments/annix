"use client";

import { useBranding } from "@/app/lib/query/hooks";
import { brandingFallback, resolveBrandAssetUrl } from "../branding";

/**
 * Branded loading indicator: the brand's logo icon animated with the style
 * chosen on its branding page (pulse/spin/bounce/glow/float).
 */
export function BrandedLoader(props: { brand: string; label?: string; size?: number }) {
  const { brand, label } = props;
  const sizeProp = props.size;
  const size = sizeProp ?? 64;
  const query = useBranding(brand);
  const data = query.data;
  const branding = data || brandingFallback(brand);
  const logoUrl = resolveBrandAssetUrl("logoIcon", branding);
  const animField = branding.loadingAnimation;
  const anim = animField || "pulse";

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`rounded-[18%] bg-contain bg-center bg-no-repeat brand-anim-${anim}`}
        style={{ width: size, height: size, backgroundImage: `url('${logoUrl}')` }}
      />
      {label ? <p className="text-sm text-white/70">{label}</p> : null}
    </div>
  );
}
