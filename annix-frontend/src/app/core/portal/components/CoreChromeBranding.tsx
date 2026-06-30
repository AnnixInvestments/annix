"use client";

import type { ReactNode } from "react";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { brandingCssVars, brandingFallback } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";
import type { CoreApp } from "../config/navAppMap";

const SC_BRAND_KEY = "annix-core";

/**
 * Applies the ACTIVE app's branding to the shell chrome as brand CSS vars
 * (--brand-navbar / --brand-accent / …) on a display:contents wrapper, which
 * the sidebar + header consume. NEVER hardcodes hex/logos — colours come from
 * the branding system. Rendered INSIDE CoreAppProviders so AU's legacy branding
 * provider is in scope.
 */
function StockControlBrandingScope(props: { children: ReactNode }) {
  const brandingQuery = useBranding(SC_BRAND_KEY);
  const brandingData = brandingQuery.data;
  const branding = brandingData ?? brandingFallback(SC_BRAND_KEY);
  const vars = brandingCssVars(branding);
  return (
    <div style={vars} className="contents">
      {props.children}
    </div>
  );
}

const AU_BRAND_KEY = "au-rubber";

function AuRubberBrandingScope(props: { children: ReactNode }) {
  // AU Rubber has no unified-branding brand code; its identity lives in the
  // legacy AuRubberBranding system (admin-configurable, corpId-defaulted). We
  // feed its navbar/accent into a full Branding (defaults for the rest) and run
  // it through the SAME brandingCssVars helper, so AU emits the COMPLETE brand
  // var set — a future chrome var can't silently break AU while SC works. Still
  // the branding system, no value hardcoded here.
  const auBranding = useAuRubberBranding();
  const colors = auBranding.colors;
  const navbar = colors.background;
  const accent = colors.accent;
  const branding = { ...brandingFallback(AU_BRAND_KEY), navbarColor: navbar, accentOrange: accent };
  const vars = brandingCssVars(branding);
  return (
    <div style={vars} className="contents">
      {props.children}
    </div>
  );
}

export function CoreChromeBranding(props: { activeApp: CoreApp; children: ReactNode }) {
  if (props.activeApp === "stock-control") {
    return <StockControlBrandingScope>{props.children}</StockControlBrandingScope>;
  }
  return <AuRubberBrandingScope>{props.children}</AuRubberBrandingScope>;
}
