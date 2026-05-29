export const BRAND_CODES = [
  "annix-investments",
  "annix-orbit",
  "annix-insights",
  "annix-rep",
  "annix-sentinel",
  "annix-forge",
] as const;

export type BrandCode = (typeof BRAND_CODES)[number];

export function isBrandCode(value: string): value is BrandCode {
  return (BRAND_CODES as readonly string[]).includes(value);
}

export const MASTER_BRAND_CODE: BrandCode = "annix-investments";

export const INHERITABLE_SCALAR_FIELDS = [
  "navbarColor",
  "accentOrange",
  "accentOrangeLight",
  "accentOrangeDark",
  "gradientFrom",
  "gradientVia",
  "gradientTo",
  "tagline",
  "description",
  "watermarkEnabled",
  "watermarkOpacity",
  "watermarkMaxSizePx",
  "loadingAnimation",
] as const;

export type InheritableScalarField = (typeof INHERITABLE_SCALAR_FIELDS)[number];

export function isInheritableScalarField(value: string): value is InheritableScalarField {
  return (INHERITABLE_SCALAR_FIELDS as readonly string[]).includes(value);
}

export interface PlatformBrandingScalars {
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
}

export const PLATFORM_BRANDING_DEFAULTS: PlatformBrandingScalars = {
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
};
