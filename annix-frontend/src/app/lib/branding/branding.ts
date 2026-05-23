export type BrandingAssetSlot = "logoIcon" | "logoLockup" | "wordmark" | "favicon" | "watermark";

export interface Branding {
  brandCode: string;
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
  loadingAnimation: string;
  assets: Record<BrandingAssetSlot, boolean>;
  assetVersion: number;
}

export const BRAND_LOADING_ANIMATIONS = [
  { key: "pulse", label: "Pulse" },
  { key: "spin", label: "Spin" },
  { key: "bounce", label: "Bounce" },
  { key: "glow", label: "Glow" },
  { key: "float", label: "Float" },
] as const;

export type BrandLoadingAnimation = (typeof BRAND_LOADING_ANIMATIONS)[number]["key"];

export interface BrandingUpdate {
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
  loadingAnimation?: string;
}

export interface BrandingUploadResult {
  slot: BrandingAssetSlot;
  path: string;
  previewUrl: string;
}

/**
 * Per-brand fallback assets shown before an admin uploads a custom one. Each
 * app registers its current bundled artwork here so wiring it to branding does
 * not visually change anything until a custom asset is published.
 */
export const BRAND_ASSET_DEFAULTS: Record<string, Partial<Record<BrandingAssetSlot, string>>> = {
  "annix-orbit": {
    logoIcon: "/branding/annix-orbit-icon.png",
    logoLockup: "/branding/annix-orbit-logo.png",
    wordmark: "/branding/annix-orbit-wordmark.png",
    favicon: "/branding/annix-orbit-icon.png",
    watermark: "/branding/annix-orbit-icon.png",
  },
};

const GENERIC_ASSET_DEFAULT = "/branding/annix-orbit-icon.png";
const ASSET_STREAM_BASE = "/api/public/branding";

export function brandingFallback(brandCode: string): Branding {
  return {
    brandCode,
    navbarColor: "#323288",
    accentOrange: "#FF8A00",
    accentOrangeLight: "#FF9C33",
    accentOrangeDark: "#CC6900",
    gradientFrom: "#1a1a40",
    gradientVia: "#0d0d20",
    gradientTo: "#1a1a40",
    tagline: "",
    description: "",
    watermarkEnabled: true,
    watermarkOpacity: 0.1,
    watermarkMaxSizePx: 880,
    loadingAnimation: "pulse",
    assets: {
      logoIcon: false,
      logoLockup: false,
      wordmark: false,
      favicon: false,
      watermark: false,
    },
    assetVersion: 0,
  };
}

/** True when the brand has a real asset for the slot (uploaded or a registered
 *  per-brand default) — i.e. NOT just the generic placeholder. */
export function brandHasAsset(slot: BrandingAssetSlot, branding: Branding): boolean {
  const hasCustom = branding.assets[slot];
  if (hasCustom) return true;
  const perBrand = BRAND_ASSET_DEFAULTS[branding.brandCode];
  const fallback = perBrand ? perBrand[slot] : undefined;
  return fallback != null;
}

export function resolveBrandAssetUrl(slot: BrandingAssetSlot, branding: Branding): string {
  const hasCustom = branding.assets[slot];
  if (hasCustom) {
    return `${ASSET_STREAM_BASE}/${branding.brandCode}/asset/${slot}?v=${branding.assetVersion}`;
  }
  const perBrand = BRAND_ASSET_DEFAULTS[branding.brandCode];
  const fallback = perBrand ? perBrand[slot] : undefined;
  return fallback || GENERIC_ASSET_DEFAULT;
}

export function brandingCssVars(branding: Branding): Record<string, string> {
  const hasWatermark = brandHasAsset("watermark", branding);
  const watermarkImage = hasWatermark
    ? `url('${resolveBrandAssetUrl("watermark", branding)}')`
    : "none";
  const effectiveOpacity =
    branding.watermarkEnabled && hasWatermark ? branding.watermarkOpacity : 0;
  return {
    "--brand-navbar": branding.navbarColor,
    "--brand-navbar-hover": `color-mix(in srgb, ${branding.navbarColor} 80%, #ffffff)`,
    "--brand-navbar-active": `color-mix(in srgb, ${branding.navbarColor} 82%, #000000)`,
    "--brand-accent": branding.accentOrange,
    "--brand-accent-light": branding.accentOrangeLight,
    "--brand-accent-dark": branding.accentOrangeDark,
    "--brand-grad-from": branding.gradientFrom,
    "--brand-grad-via": branding.gradientVia,
    "--brand-grad-to": branding.gradientTo,
    "--brand-watermark-image": watermarkImage,
    "--brand-watermark-opacity": String(effectiveOpacity),
    "--brand-watermark-size": `min(85vmin, ${branding.watermarkMaxSizePx}px)`,
  };
}
