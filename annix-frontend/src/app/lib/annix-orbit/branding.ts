export type OrbitBrandingAssetSlot =
  | "logoIcon"
  | "logoLockup"
  | "wordmark"
  | "favicon"
  | "watermark";

export interface OrbitBranding {
  navbarColor: string;
  accentOrange: string;
  accentOrangeLight: string;
  accentOrangeDark: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  tagline: string;
  description: string;
  watermarkEnabled: boolean;
  watermarkOpacity: number;
  watermarkMaxSizePx: number;
  assets: Record<OrbitBrandingAssetSlot, boolean>;
  assetVersion: number;
}

export interface OrbitBrandingUpdate {
  navbarColor?: string;
  accentOrange?: string;
  accentOrangeLight?: string;
  accentOrangeDark?: string;
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
  tagline?: string;
  description?: string;
  logoIconPath?: string | null;
  logoLockupPath?: string | null;
  wordmarkPath?: string | null;
  faviconPath?: string | null;
  watermarkPath?: string | null;
  watermarkEnabled?: boolean;
  watermarkOpacity?: number;
  watermarkMaxSizePx?: number;
}

export interface OrbitBrandingUploadResult {
  slot: OrbitBrandingAssetSlot;
  path: string;
  previewUrl: string;
}

export const ORBIT_STATIC_ASSET_DEFAULTS: Record<OrbitBrandingAssetSlot, string> = {
  logoIcon: "/branding/annix-orbit-icon.png",
  logoLockup: "/branding/annix-orbit-logo.png",
  wordmark: "/branding/annix-orbit-wordmark.png",
  favicon: "/branding/annix-orbit-icon.png",
  watermark: "/branding/annix-orbit-icon.png",
};

export const ORBIT_BRANDING_FALLBACK: OrbitBranding = {
  navbarColor: "#323288",
  accentOrange: "#FF8A00",
  accentOrangeLight: "#FF9C33",
  accentOrangeDark: "#CC6900",
  gradientFrom: "#1a1a40",
  gradientVia: "#0d0d20",
  gradientTo: "#1a1a40",
  tagline: "Hiring • Talent • Compliance",
  description:
    "The intelligent workforce ecosystem for modern hiring, talent growth, and compliance.",
  watermarkEnabled: true,
  watermarkOpacity: 0.1,
  watermarkMaxSizePx: 880,
  assets: {
    logoIcon: false,
    logoLockup: false,
    wordmark: false,
    favicon: false,
    watermark: false,
  },
  assetVersion: 0,
};

const ASSET_STREAM_BASE = "/api/public/annix-orbit/branding/asset";

export function resolveOrbitAssetUrl(
  slot: OrbitBrandingAssetSlot,
  branding: OrbitBranding,
): string {
  const hasCustom = branding.assets[slot];
  const staticDefault = ORBIT_STATIC_ASSET_DEFAULTS[slot];
  if (hasCustom) {
    return `${ASSET_STREAM_BASE}/${slot}?v=${branding.assetVersion}`;
  }
  return staticDefault;
}

export function orbitBrandingCssVars(branding: OrbitBranding): Record<string, string> {
  const watermarkUrl = resolveOrbitAssetUrl("watermark", branding);
  const effectiveOpacity = branding.watermarkEnabled ? branding.watermarkOpacity : 0;
  return {
    "--orbit-navbar": branding.navbarColor,
    "--orbit-navbar-hover": `color-mix(in srgb, ${branding.navbarColor} 80%, #ffffff)`,
    "--orbit-navbar-active": `color-mix(in srgb, ${branding.navbarColor} 82%, #000000)`,
    "--orbit-accent": branding.accentOrange,
    "--orbit-accent-light": branding.accentOrangeLight,
    "--orbit-accent-dark": branding.accentOrangeDark,
    "--orbit-grad-from": branding.gradientFrom,
    "--orbit-grad-via": branding.gradientVia,
    "--orbit-grad-to": branding.gradientTo,
    "--orbit-watermark-image": `url('${watermarkUrl}')`,
    "--orbit-watermark-opacity": String(effectiveOpacity),
    "--orbit-watermark-size": `min(85vmin, ${branding.watermarkMaxSizePx}px)`,
  };
}
