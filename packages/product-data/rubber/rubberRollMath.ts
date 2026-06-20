import { RUBBER_PRICE_PRODUCTS } from "./rubberPriceProducts";
import { rubberProducts } from "./rubberProducts";

export const STANDARD_RUBBER_ROLL = {
  thicknessMm: 6,
  widthMm: 1200,
  lengthM: 12,
} as const;

export interface RubberRollDimensions {
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  sg: number;
}

export function rubberRollKg(dimensions: RubberRollDimensions): number {
  const { thicknessMm, widthMm, lengthM, sg } = dimensions;
  return thicknessMm * (widthMm / 1000) * lengthM * sg;
}

export interface PricePerKgFromRollInput extends RubberRollDimensions {
  rollPrice: number;
}

export function pricePerKgFromRoll(input: PricePerKgFromRollInput): number | null {
  const { rollPrice, sg } = input;
  if (sg <= 0 || rollPrice <= 0) {
    return null;
  }
  const kg = rubberRollKg(input);
  if (kg <= 0) {
    return null;
  }
  return rollPrice / kg;
}

const CURE_PREFIXES = ["SC", "CR", "CC", "CO", "SG", "RS"];

function normalizeRubberCode(code: string): string {
  const upper = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const prefix = CURE_PREFIXES.find((candidate) => upper.startsWith(candidate));
  return prefix ? upper.slice(prefix.length) : upper;
}

export function lookupRubberSgByCode(code: string | null | undefined): number | null {
  if (!code) {
    return null;
  }
  const normalized = normalizeRubberCode(code);
  if (!normalized) {
    return null;
  }
  const priceMatch = RUBBER_PRICE_PRODUCTS.find(
    (product) =>
      product.specificGravity != null && normalizeRubberCode(product.code) === normalized,
  );
  if (priceMatch?.specificGravity != null) {
    return priceMatch.specificGravity;
  }
  const datasheetMatch = rubberProducts.find(
    (product) => normalizeRubberCode(product.compoundCode) === normalized,
  );
  return datasheetMatch?.density ?? null;
}

const DEFAULT_SG_BY_TYPE: Record<string, number> = {
  natural: 1.05,
  "premium natural": 1.05,
  chemical: 1.13,
  chlorobutyl: 1.13,
  bromobutyl: 1.13,
  butyl: 1.13,
  nitrile: 1.21,
  neoprene: 1.4,
  epdm: 1.1,
  ebonite: 1.15,
};

export function defaultRubberSgByType(compoundType: string | null | undefined): number {
  if (!compoundType) {
    return 1.1;
  }
  return DEFAULT_SG_BY_TYPE[compoundType.trim().toLowerCase()] ?? 1.1;
}
