export type BrandingAssetSlot =
  | "logoIcon"
  | "logoLockup"
  | "wordmark"
  | "favicon"
  | "watermark"
  | "textCrop"
  | "subMark"
  | "flashLine"
  | "heroImage"
  | "loginCard"
  | "pageBackground"
  | "heroTop"
  | "heroBottom";

export type BrandingAssetVariant = "light" | "dark";

export interface Branding {
  brandCode: string;
  navbarColor: string;
  navbarColorLight: string;
  backgroundLight: string;
  backgroundDark: string;
  accentOrange: string;
  accentOrangeLight: string;
  accentOrangeDark: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  tagline: string;
  description: string;
  heroWords: string;
  fontDisplay: string;
  fontHeadings: string;
  fontBody: string;
  watermarkEnabled: boolean;
  watermarkOpacity: number;
  watermarkMaxSizePx: number;
  loadingAnimation: string;
  heroTopHeightPct: number;
  heroBottomHeightPct: number;
  heroTopFadePct: number;
  heroBottomFadePct: number;
  assets: Record<BrandingAssetSlot, boolean>;
  assetsDark: Record<BrandingAssetSlot, boolean>;
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

export const MASTER_BRAND_CODE = "annix-investments";

export const INHERITABLE_SCALAR_FIELDS = [
  "navbarColor",
  "navbarColorLight",
  "backgroundLight",
  "backgroundDark",
  "accentOrange",
  "accentOrangeLight",
  "accentOrangeDark",
  "gradientFrom",
  "gradientVia",
  "gradientTo",
  "tagline",
  "description",
  "heroWords",
  "fontDisplay",
  "fontHeadings",
  "fontBody",
  "watermarkEnabled",
  "watermarkOpacity",
  "watermarkMaxSizePx",
  "loadingAnimation",
  "heroTopHeightPct",
  "heroBottomHeightPct",
  "heroTopFadePct",
  "heroBottomFadePct",
] as const;

export type InheritableScalarField = (typeof INHERITABLE_SCALAR_FIELDS)[number];

export const BRAND_FONT_OPTIONS = [
  "Orbitron",
  "Exo 2",
  "Inter",
  "Montserrat",
  "Poppins",
  "Rajdhani",
  "Roboto",
  "Roboto Mono",
  "Space Grotesk",
  "Sora",
  "Archivo",
  "Lexend",
] as const;

/** Admin editor payload: the brand's own values, the master's effective values
 *  (shown when a field inherits), and the resolved effective branding. */
export interface BrandingAdminView {
  brandCode: string;
  isMaster: boolean;
  inheritedFields: string[];
  lockedScalarFields: string[];
  lockedAssetSlots: BrandingAssetSlot[];
  own: Branding;
  master: Branding;
  effective: Branding;
}

export interface BrandingUpdate {
  navbarColor?: string;
  navbarColorLight?: string;
  backgroundLight?: string;
  backgroundDark?: string;
  accentOrange?: string;
  accentOrangeLight?: string;
  accentOrangeDark?: string;
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
  tagline?: string;
  description?: string;
  heroWords?: string;
  fontDisplay?: string;
  fontHeadings?: string;
  fontBody?: string;
  logoIconPath?: string | null;
  logoLockupPath?: string | null;
  wordmarkPath?: string | null;
  faviconPath?: string | null;
  watermarkPath?: string | null;
  textCropPath?: string | null;
  subMarkPath?: string | null;
  flashLinePath?: string | null;
  heroImagePath?: string | null;
  loginCardPath?: string | null;
  loginCardPathDark?: string | null;
  pageBackgroundPath?: string | null;
  pageBackgroundPathDark?: string | null;
  heroTopPath?: string | null;
  heroTopPathDark?: string | null;
  heroBottomPath?: string | null;
  heroBottomPathDark?: string | null;
  logoIconPathDark?: string | null;
  logoLockupPathDark?: string | null;
  wordmarkPathDark?: string | null;
  faviconPathDark?: string | null;
  watermarkPathDark?: string | null;
  textCropPathDark?: string | null;
  subMarkPathDark?: string | null;
  flashLinePathDark?: string | null;
  heroImagePathDark?: string | null;
  watermarkEnabled?: boolean;
  watermarkOpacity?: number;
  watermarkMaxSizePx?: number;
  loadingAnimation?: string;
  heroTopHeightPct?: number;
  heroBottomHeightPct?: number;
  heroTopFadePct?: number;
  heroBottomFadePct?: number;
  inheritedFields?: string[];
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
  "annix-core": {
    logoIcon: "/branding/annix-core-card.png",
    logoLockup: "/branding/annix-core-card.png",
    favicon: "/branding/annix-core-card.png",
    watermark: "/branding/annix-core-card.png",
    loginCard: "/branding/annix-core-card.png",
  },
  "annix-forge": {
    logoIcon: "/branding/annix-forge-icon.svg",
    logoLockup: "/branding/annix-forge-logo.svg",
    wordmark: "/branding/annix-forge-wordmark.svg",
    favicon: "/branding/annix-forge-favicon.svg",
    watermark: "/branding/annix-forge-icon.svg",
  },
  "annix-orbit": {
    logoIcon: "/branding/annix-orbit-icon.png",
    logoLockup: "/branding/annix-orbit-logo.png",
    wordmark: "/branding/annix-orbit-wordmark.png",
    favicon: "/branding/annix-orbit-icon.png",
    watermark: "/branding/annix-orbit-icon.png",
  },
  "annix-sentinel": {
    logoIcon: "/branding/annix-sentinel-icon.svg",
    logoLockup: "/branding/annix-sentinel-logo-dark.svg",
    wordmark: "/branding/annix-sentinel-wordmark.svg",
    favicon: "/branding/annix-sentinel-favicon.svg",
    watermark: "/branding/annix-sentinel-icon.svg",
  },
};

/** Platform-wide bundled defaults shown on every brand, mirroring the
 *  globally-locked hero slots — so heroes appear on all apps/environments
 *  without a per-env S3 upload. */
const GLOBAL_ASSET_DEFAULTS: Partial<Record<BrandingAssetSlot, string>> = {
  heroTop: "/branding/annix-investments-hero-top.webp",
  heroBottom: "/branding/annix-investments-hero-bottom.webp",
};

const GENERIC_ASSET_DEFAULT = "/branding/annix-orbit-icon.png";
const ASSET_STREAM_BASE = "/api/public/branding";

function emptyAssetPresence(): Record<BrandingAssetSlot, boolean> {
  return {
    logoIcon: false,
    logoLockup: false,
    wordmark: false,
    favicon: false,
    watermark: false,
    textCrop: false,
    subMark: false,
    flashLine: false,
    heroImage: false,
    loginCard: false,
    pageBackground: false,
    heroTop: false,
    heroBottom: false,
  };
}

export function brandingFallback(brandCode: string): Branding {
  return {
    brandCode,
    navbarColor: "#323288",
    navbarColorLight: "#F2F4F7",
    backgroundLight: "#0a1733",
    backgroundDark: "#0a1733",
    accentOrange: "#FF8A00",
    accentOrangeLight: "#FF9C33",
    accentOrangeDark: "#CC6900",
    gradientFrom: "#0b1b3a",
    gradientVia: "#0a1733",
    gradientTo: "#070f24",
    tagline: "",
    description: "",
    heroWords: "",
    fontDisplay: "Orbitron",
    fontHeadings: "Exo 2",
    fontBody: "Inter",
    watermarkEnabled: true,
    watermarkOpacity: 0.1,
    watermarkMaxSizePx: 880,
    loadingAnimation: "pulse",
    heroTopHeightPct: 60,
    heroBottomHeightPct: 40,
    heroTopFadePct: 45,
    heroBottomFadePct: 45,
    assets: emptyAssetPresence(),
    assetsDark: emptyAssetPresence(),
    assetVersion: 0,
  };
}

/** True when the brand has a real asset for the slot/variant (uploaded or a
 *  registered per-brand default) — i.e. NOT just the generic placeholder.
 *  Dark variants have no per-brand bundled defaults, so they are only "present"
 *  when an admin has uploaded one. */
export function brandHasAsset(
  slot: BrandingAssetSlot,
  branding: Branding,
  variant: BrandingAssetVariant = "light",
): boolean {
  if (variant === "dark") {
    return branding.assetsDark[slot];
  }
  const hasCustom = branding.assets[slot];
  if (hasCustom) return true;
  const perBrand = BRAND_ASSET_DEFAULTS[branding.brandCode];
  const brandFallback = perBrand ? perBrand[slot] : undefined;
  if (brandFallback != null) return true;
  const globalFallback = GLOBAL_ASSET_DEFAULTS[slot];
  return globalFallback != null;
}

export function resolveBrandAssetUrl(
  slot: BrandingAssetSlot,
  branding: Branding,
  variant: BrandingAssetVariant = "light",
): string {
  if (variant === "dark") {
    const hasDark = branding.assetsDark[slot];
    if (hasDark) {
      return `${ASSET_STREAM_BASE}/${branding.brandCode}/asset/${slot}?variant=dark&v=${branding.assetVersion}`;
    }
    return resolveBrandAssetUrl(slot, branding, "light");
  }
  const hasCustom = branding.assets[slot];
  if (hasCustom) {
    return `${ASSET_STREAM_BASE}/${branding.brandCode}/asset/${slot}?v=${branding.assetVersion}`;
  }
  const perBrand = BRAND_ASSET_DEFAULTS[branding.brandCode];
  const brandFallback = perBrand ? perBrand[slot] : undefined;
  const globalFallback = GLOBAL_ASSET_DEFAULTS[slot];
  return brandFallback || globalFallback || GENERIC_ASSET_DEFAULT;
}

export function brandingCssVars(
  branding: Branding,
  mode: BrandingAssetVariant = "light",
): Record<string, string> {
  const hasWatermark = brandHasAsset("watermark", branding, mode);
  const watermarkImage = hasWatermark
    ? `url('${resolveBrandAssetUrl("watermark", branding, mode)}')`
    : "none";
  const effectiveOpacity =
    branding.watermarkEnabled && hasWatermark ? branding.watermarkOpacity : 0;
  const hasPageBackground = brandHasAsset("pageBackground", branding, mode);
  const pageBackgroundImage = hasPageBackground
    ? `url('${resolveBrandAssetUrl("pageBackground", branding, mode)}')`
    : "none";
  return {
    "--brand-navbar": branding.navbarColor,
    "--brand-navbar-hover": `color-mix(in srgb, ${branding.navbarColor} 80%, #ffffff)`,
    "--brand-navbar-active": `color-mix(in srgb, ${branding.navbarColor} 82%, #000000)`,
    "--brand-navbar-50": `color-mix(in srgb, ${branding.navbarColor} 7%, #ffffff)`,
    "--brand-navbar-100": `color-mix(in srgb, ${branding.navbarColor} 15%, #ffffff)`,
    "--brand-navbar-200": `color-mix(in srgb, ${branding.navbarColor} 30%, #ffffff)`,
    "--brand-navbar-400": `color-mix(in srgb, ${branding.navbarColor} 68%, #ffffff)`,
    "--brand-accent": branding.accentOrange,
    "--brand-accent-light": branding.accentOrangeLight,
    "--brand-accent-dark": branding.accentOrangeDark,
    "--brand-grad-from": branding.gradientFrom,
    "--brand-grad-via": branding.gradientVia,
    "--brand-grad-to": branding.gradientTo,
    "--brand-font-display": fontStack(branding.fontDisplay, "sans-serif"),
    "--brand-font-headings": fontStack(branding.fontHeadings, "sans-serif"),
    "--brand-font-body": fontStack(branding.fontBody, "sans-serif"),
    "--brand-watermark-image": watermarkImage,
    "--brand-watermark-opacity": String(effectiveOpacity),
    "--brand-watermark-size": `min(70vmin, ${branding.watermarkMaxSizePx}px)`,
    "--brand-page-background-image": pageBackgroundImage,
  };
}

function fontStack(family: string, fallback: string): string {
  const name = family.trim();
  if (name.length === 0) {
    return fallback;
  }
  return `'${name}', ${fallback}`;
}

/** Builds a Google Fonts stylesheet href for the brand's three font families,
 *  or null when every family is empty. Loads each weight set we use. */
export function googleFontsHref(branding: Branding): string | null {
  const families = [branding.fontDisplay, branding.fontHeadings, branding.fontBody]
    .map((family) => family.trim())
    .filter((family) => family.length > 0);
  const unique = Array.from(new Set(families));
  if (unique.length === 0) {
    return null;
  }
  const params = unique
    .map((family) => `family=${encodeURIComponent(family)}:wght@400;500;600;700;800`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
