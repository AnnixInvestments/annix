import { outerDiameterFromNB } from "@/app/lib/query/hooks";
import { calculateTotalSurfaceArea, type SurfaceAreaResult } from "@/app/lib/utils/pipeSurfaceArea";
import type { QuoteItem } from "./poolItemsBySpec";

export interface ItemSurfaceArea {
  /** Per-pipe areas (one item of `quantity = 1`). */
  perPipe: SurfaceAreaResult;
  /** Multiplied by `quoteItem.quantity`. */
  total: {
    totalExternalAreaM2: number;
    totalInternalAreaM2: number;
    totalSurfaceAreaM2: number;
  };
}

/**
 * Computes coating (external) + lining (internal) m² for a single Nix-extracted
 * quote item by delegating to the shared pipe calculator. The Nix extraction
 * shape carries primitive dimensions (NB, WT, L, flange config) but no OD —
 * OD is resolved through the canonical `nbToOdMap` (TanStack-cached, fed by
 * the backend's flange-weight tables).
 *
 * Flange end detection mirrors the strings the Gemini extractor emits today:
 *   F.B.E F/F   → flanged both ends, flat-on-flat — 2 flanges
 *   F.B.E       → flanged both ends — 2 flanges
 *   P.E.        → plain ends — 0 flanges
 *   F.O.E       → flanged one end — 1 flange
 *   B.W.        → butt-weld ends — 0 flanges
 * Anything else is treated as 'no flange' so the area is just the bare pipe;
 * the calculator's flange allowance only kicks in for actual flange counts.
 *
 * Returns null when the item lacks the data needed (no length, no diameter,
 * no wall thickness) — callers should render '—' in that case rather than a
 * misleading zero.
 */
export function surfaceAreaForQuoteItem(
  item: QuoteItem,
  nbToOdMap: Record<number, number>,
): ItemSurfaceArea | null {
  const itemDiameter = item.diameter;
  const itemWall = item.wallThickness;
  const itemLengthMm = item.length;
  if (itemDiameter === null || itemWall === null || itemLengthMm === null) return null;
  if (itemDiameter <= 0 || itemWall <= 0 || itemLengthMm <= 0) return null;

  const dn = itemDiameter;
  const odMm = outerDiameterFromNB(nbToOdMap, dn);
  const idMm = odMm - 2 * itemWall;
  if (idMm <= 0) return null;

  const lengthM = itemLengthMm / 1000;
  const flangeCount = countFlangesFromConfig(item.flangeConfig);
  const quantity = item.quantity > 0 ? item.quantity : 1;

  const raw = calculateTotalSurfaceArea({
    outsideDiameterMm: odMm,
    insideDiameterMm: idMm,
    individualPipeLengthM: lengthM,
    numberOfPipes: quantity,
    hasFlangeEnd1: flangeCount >= 1,
    hasFlangeEnd2: flangeCount >= 2,
    dn,
  });

  // Stock-control quote convention (user-confirmed 2026-05-11): the 100 mm-
  // per-flange-end length extension already accounts for the paint / lining
  // overlap onto the flange face, so adding the back-of-flange annular ring
  // on top would double-count the same area. Strip the flange-ring fields
  // from both the per-pipe result and the quantity-multiplied totals so the
  // quote shows bare-pipe surface area only:
  //   external = π × OD × (L + 0.1 × flangeCount)
  //   internal = π × ID × (L + 0.1 × flangeCount)
  //
  // The underlying calculator stays untouched because the RFQ surface-
  // protection export still consumes the flange-ring contributions today —
  // when they're ready to switch over we'll promote this stripping logic
  // into a shared `bareLateralAreaOnly` flag on the calculator.
  const perPipe = {
    ...raw.perPipe,
    externalFlangeBackAreaM2: 0,
    internalFlangeFaceAreaM2: 0,
    totalExternalAreaM2: raw.perPipe.externalPipeAreaM2,
    totalInternalAreaM2: raw.perPipe.internalPipeAreaM2,
    totalSurfaceAreaM2: raw.perPipe.externalPipeAreaM2 + raw.perPipe.internalPipeAreaM2,
  };
  return {
    perPipe,
    total: {
      totalExternalAreaM2: perPipe.totalExternalAreaM2 * quantity,
      totalInternalAreaM2: perPipe.totalInternalAreaM2 * quantity,
      totalSurfaceAreaM2: perPipe.totalSurfaceAreaM2 * quantity,
    },
  };
}

/**
 * Sums per-row totals across a list of items. Used by the pool footer to
 * show 'X m² total' for the pool, picking external / internal / total based
 * on what the pool's spec applies to (coating / lining / both).
 */
export function sumPoolTotals(rows: (ItemSurfaceArea | null)[]) {
  let totalExternal = 0;
  let totalInternal = 0;
  let totalCombined = 0;
  for (const row of rows) {
    if (!row) continue;
    totalExternal += row.total.totalExternalAreaM2;
    totalInternal += row.total.totalInternalAreaM2;
    totalCombined += row.total.totalSurfaceAreaM2;
  }
  return { totalExternal, totalInternal, totalCombined };
}

/**
 * Convention used across `pipeSurfaceArea.ts` and our running-metre lining
 * costing: each flanged end adds 100 mm of effective length to account for
 * the rubber / paint overlapping the flange face. Same constant as
 * `SURFACE_AREA_CONSTANTS.FLANGE_ALLOWANCE_M` from `@annix/product-data/pipe`.
 */
export const FLANGE_LENGTH_ALLOWANCE_M = 0.1;

/**
 * Effective lining length per pipe, in metres — includes the flange overlap
 * allowance. Returns 0 when the item has no length recorded. Used by the
 * rubber-lining 'over 3m → priced per running metre' pricing branch.
 */
export function effectiveLiningLengthM(item: QuoteItem): number {
  const lengthMm = item.length;
  if (lengthMm === null || lengthMm <= 0) return 0;
  const lengthM = lengthMm / 1000;
  const flangeCount = countFlangesFromConfig(item.flangeConfig);
  return lengthM + flangeCount * FLANGE_LENGTH_ALLOWANCE_M;
}

/**
 * True when the item should be priced per running metre rather than per m²
 * under the rubber-lining pricing schedule. Threshold matches the user's
 * spec (pipes >= 3 m) — fittings, plate work, and short pipes use the m²
 * rate instead.
 */
export function isLongPipeForLiningPricing(item: QuoteItem): boolean {
  if (item.itemType === null) return false;
  if (!/pipe/i.test(item.itemType)) return false;
  const lengthMm = item.length;
  if (lengthMm === null) return false;
  return lengthMm >= 3000;
}

export function countFlangesFromConfig(config: string | null): number {
  if (!config) return 0;
  const normalised = config.trim().toUpperCase();
  if (/^P\.?E\.?$/.test(normalised)) return 0;
  if (/^B\.?W\.?$/.test(normalised)) return 0;
  if (/F\.?B\.?E\.?/.test(normalised)) return 2;
  if (/F\.?O\.?E\.?/.test(normalised)) return 1;
  if (/F\/F/.test(normalised)) return 2;
  return 0;
}
