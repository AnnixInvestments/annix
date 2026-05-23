export const BRAND_CODES = [
  "annix-investments",
  "annix-orbit",
  "annix-insights",
  "annix-rep",
  "comply-sa",
] as const;

export type BrandCode = (typeof BRAND_CODES)[number];

export function isBrandCode(value: string): value is BrandCode {
  return (BRAND_CODES as readonly string[]).includes(value);
}
