import type { CatalogueSource } from "./fitting-dimension-sources";
import { catalogueSource } from "./fitting-dimension-sources";

// HDPE PE100 SDR 11 butt-fusion reducer end-to-end length (mm).
// Sourced from the HdpePolyfittings PE100 SDR11 concentric reducer
// catalogue (the most comprehensive open-catalogue coverage of any
// HDPE fitting type — ~60 catalogue pairs). Cross-checked against
// the SA suppliers (Flo-Tek, Sinvac) which confirm product range
// but don't tabulate per-DN values.
//
// Per ISO 4427-3 and every published catalogue checked, eccentric
// reducer length matches concentric at the same DN×branchDN —
// callers use this same table for both reducer types.
//
// Keyed by `${largerDn}x${smallerDn}` (direction-agnostic — the
// lookup helper canonicalises before the lookup).

// Foreign key into HDPE_FITTING_DIMENSION_SOURCES — every entry in
// REDUCER_LENGTH_MM came from this single source. If a future
// catalogue update introduces per-pair source variation, switch to
// a `Record<string, { lengthMm: number; sourceId: string }>` shape.
const REDUCER_DEFAULT_SOURCE_ID = "hdpepolyfittings";

const REDUCER_LENGTH_MM: Record<string, number> = {
  "50x32": 135,
  "63x32": 135,
  "63x50": 135,
  "75x50": 146,
  "75x63": 146,
  "90x50": 176,
  "90x63": 176,
  "90x75": 176,
  "110x63": 200,
  "110x75": 200,
  "110x90": 200,
  "125x90": 203,
  "125x110": 203,
  "140x110": 207,
  "160x90": 220,
  "160x110": 220,
  "160x125": 220,
  "160x140": 220,
  "180x110": 240,
  "180x160": 240,
  "200x110": 267,
  "200x125": 267,
  "200x160": 267,
  "200x180": 267,
  "225x160": 290,
  "225x200": 290,
  "250x160": 290,
  "250x180": 290,
  "250x200": 280,
  "250x225": 280,
  "280x200": 250,
  "280x225": 250,
  "280x250": 250,
  "315x200": 255,
  "315x225": 255,
  "315x250": 255,
  "315x280": 255,
  "355x250": 285,
  "355x280": 285,
  "355x315": 285,
  "400x250": 285,
  "400x315": 285,
  "400x355": 285,
  "450x315": 265,
  "450x355": 265,
  "450x400": 265,
  "500x315": 250,
  "500x400": 250,
  "500x450": 250,
  "560x400": 250,
  "560x450": 250,
  "560x500": 250,
  "630x400": 250,
  "630x500": 250,
  "630x560": 250,
  "710x500": 250,
  "710x560": 250,
  "710x630": 250,
  "800x500": 250,
  "800x560": 250,
  "800x630": 250,
  "800x710": 250,
};

const reducerKey = (largerDn: number, smallerDn: number): string =>
  `${Math.max(largerDn, smallerDn)}x${Math.min(largerDn, smallerDn)}`;

// Concentric / eccentric reducer end-to-end length (mm). Returns null
// when the (mainDN, branchDN) pair isn't catalogued. Direction-
// agnostic — works whether you pass (250, 160) or (160, 250).
export const hdpeReducerLength = (dnAMm: number, dnBMm: number): number | null => {
  if (dnAMm === dnBMm) return null;
  const key = reducerKey(dnAMm, dnBMm);
  const length = REDUCER_LENGTH_MM[key];
  return length ?? null;
};

// When the BOQ source doesn't specify the smaller end of a reducer
// (e.g. "355NB Concentric Reducer" with no x250), infer the largest
// standard reduction available in the catalogue at that main DN —
// i.e. the smallest catalogued branch. SA mining take-offs typically
// want the biggest plausible reduction so the supplier sources the
// most-flexible part. Returns null when no catalogue rows exist for
// that main DN. Caller should mark the result as "inferred" /
// "supplier to confirm" in the BOQ row description so the quoter
// knows the smaller end wasn't in the source doc.
export const inferReducerBranchDn = (mainDnMm: number): number | null => {
  let smallestBranch: number | null = null;
  for (const key of Object.keys(REDUCER_LENGTH_MM)) {
    const [largerStr, smallerStr] = key.split("x");
    const larger = Number(largerStr);
    const smaller = Number(smallerStr);
    if (larger !== mainDnMm) continue;
    if (smallestBranch === null || smaller < smallestBranch) {
      smallestBranch = smaller;
    }
  }
  return smallestBranch;
};

// Catalogue source for a given reducer pair. Returns null when the
// pair isn't in the table (so the caller can't claim provenance).
// Useful for BOQ tooltips / audit reports that want to surface which
// manufacturer's catalogue the value came from.
export const hdpeReducerSource = (dnAMm: number, dnBMm: number): CatalogueSource | null => {
  const length = hdpeReducerLength(dnAMm, dnBMm);
  if (length == null) return null;
  return catalogueSource(REDUCER_DEFAULT_SOURCE_ID);
};
