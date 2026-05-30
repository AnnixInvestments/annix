export const BRAND_CODES = [
  "annix-investments",
  "annix-orbit",
  "annix-insights",
  "annix-rep",
  "annix-sentinel",
  "annix-forge",
  "annix-core",
] as const;

export type BrandCode = (typeof BRAND_CODES)[number];

export function isBrandCode(value: string): value is BrandCode {
  return (BRAND_CODES as readonly string[]).includes(value);
}

export const MASTER_BRAND_CODE: BrandCode = "annix-investments";

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
] as const;

export type InheritableScalarField = (typeof INHERITABLE_SCALAR_FIELDS)[number];

export function isInheritableScalarField(value: string): value is InheritableScalarField {
  return (INHERITABLE_SCALAR_FIELDS as readonly string[]).includes(value);
}

export const GLOBAL_LOCKED_SCALAR_FIELDS = [
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
] as const;

export const GLOBAL_LOCKED_ASSET_SLOTS = ["logoIcon", "wordmark"] as const;

export const GLOBAL_LOCK_EXEMPT_BRANDS: readonly string[] = ["annix-sentinel"];

export function brandLocksGlobals(brand: string): boolean {
  return brand !== MASTER_BRAND_CODE && !GLOBAL_LOCK_EXEMPT_BRANDS.includes(brand);
}

export interface PlatformBrandingScalars {
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
}

export const PLATFORM_BRANDING_DEFAULTS: PlatformBrandingScalars = {
  navbarColor: "#323288",
  navbarColorLight: "#F2F4F7",
  backgroundLight: "#F8FAFC",
  backgroundDark: "#0F172A",
  accentOrange: "#FF8A00",
  accentOrangeLight: "#FF9C33",
  accentOrangeDark: "#CC6900",
  gradientFrom: "#1a1a40",
  gradientVia: "#0d0d20",
  gradientTo: "#1a1a40",
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
};
