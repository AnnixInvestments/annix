import { outerDiameterFromNB } from "@/app/lib/query/hooks";
import { getFlangeDimensionsByDn, type SurfaceAreaResult } from "@/app/lib/utils/pipeSurfaceArea";
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

  // Stock-control quote convention v2 (user-confirmed 2026-05-11, test pass
  // 2): use raw pipe length (no 100 mm-per-flange extension) AND add an
  // explicit flange-face annular contribution per flange end. The flange
  // face is the steel disc minus the bore hole — same formula for external
  // (paint on the back face) and internal (lining on the front face) per
  // the user's spec: π/4 × (flangeOD² − pipeID²) per flange.
  //
  // For mark -01 (NB1000 × WT16 × L6000 F.B.E F/F, flangeOD=1219, pipeID=984):
  //   pipe external = π × 1.016 × 6.0       = 19.15 m²
  //   flange face   = π/4 × (1.219² − 0.984²) × 2
  //                 = π/4 × 0.5174 × 2      = 0.8126 m²
  //   per-item ext  = 19.96 m²
  //
  // Shared `pipeSurfaceArea` calculator stays untouched — RFQ still uses
  // its prior convention.
  const flangeFaceAreaPerEndM2 = flangeFaceAnnularM2(odMm, idMm, dn, flangeCount);
  const odM = odMm / 1000;
  const idM = idMm / 1000;
  const externalPipeAreaM2 = Math.PI * odM * lengthM;
  const internalPipeAreaM2 = Math.PI * idM * lengthM;
  const flangeContributionTotalM2 = flangeFaceAreaPerEndM2 * flangeCount;
  const totalExternalAreaM2 = externalPipeAreaM2 + flangeContributionTotalM2;
  const totalInternalAreaM2 = internalPipeAreaM2 + flangeContributionTotalM2;

  const perPipe: SurfaceAreaResult = {
    externalPipeAreaM2,
    externalFlangeBackAreaM2: flangeContributionTotalM2,
    totalExternalAreaM2,
    internalPipeAreaM2,
    internalFlangeFaceAreaM2: flangeContributionTotalM2,
    totalInternalAreaM2,
    totalSurfaceAreaM2: totalExternalAreaM2 + totalInternalAreaM2,
    flangeDataAvailable: flangeCount > 0 && flangeFaceAreaPerEndM2 > 0,
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
 * Steel-only annular face area of ONE flange end, in m². Formula per the
 * user's quote spec: take the flange OD (looked up from the ANSI B16.5
 * Class 150 table by DN), subtract the bore hole (pipe ID), and treat the
 * remaining annulus as the paintable / linable steel face:
 *
 *   A_face = π/4 × (flangeOD² − pipeID²)        [m²]
 *
 * Returns 0 when flangeCount is 0 (no flanges to contribute) or when the
 * lookup falls through. Lookup falls back to an OD × 1.8 estimate, matching
 * `pipeSurfaceArea`'s heuristic for DNs not in the table, so weird sizes
 * still get a sensible figure.
 */
function flangeFaceAnnularM2(
  pipeOdMm: number,
  pipeIdMm: number,
  dn: number,
  flangeCount: number,
): number {
  if (flangeCount <= 0) return 0;
  const flangeDims = getFlangeDimensionsByDn(dn);
  const flangeOdMm = flangeDims ? flangeDims.flangeOdMm : pipeOdMm * 1.8;
  if (flangeOdMm <= pipeIdMm) return 0;
  const flangeOdM = flangeOdMm / 1000;
  const pipeIdM = pipeIdMm / 1000;
  return (Math.PI / 4) * (flangeOdM * flangeOdM - pipeIdM * pipeIdM);
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
 * Effective lining length per pipe, in metres — bare pipe length only as of
 * the v2 quote convention (2026-05-11). The previous 100 mm-per-flange
 * extension is gone: the rubber-lining 'over 3 m → priced per running
 * metre' pricing branch now uses raw length, and the flange-face steel
 * area is captured separately by `flangeFaceAnnularM2` in the m² branch.
 * Returns 0 when the item has no length recorded.
 */
export function effectiveLiningLengthM(item: QuoteItem): number {
  const lengthMm = item.length;
  if (lengthMm === null || lengthMm <= 0) return 0;
  return lengthMm / 1000;
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
