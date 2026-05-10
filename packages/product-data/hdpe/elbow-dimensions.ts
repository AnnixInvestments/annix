import type { ElbowDims } from "./fitting-dimension-types";

// HDPE PE100 SDR 11 moulded butt-fusion elbow dimensions, sourced
// from publicly-published manufacturer catalogues (HdpePolyfittings,
// Chuangrong) and cross-checked against SA suppliers (Flo-Tek and
// Sinvac confirm product range; their brochures don't tabulate
// per-DN values).
//
// SA mining context: bends ≥ DN 250 are fabricated mitre bends sized
// BY the formula `R × tan(θ/2)` (no catalogue table exists), and
// bends ≤ DN 200 are moulded — the formula deviates up to 27% at
// DN 110 dropping to ~3% at DN 200. The take-off should prefer the
// catalogue value for moulded sizes and fall through to the formula
// for fabricated ones.

const ELBOW_90_DIMS: Record<number, ElbowDims> = {
  50: { faceToFaceMm: 120, centreToFaceMm: 66, source: "catalogue", sourceId: "hdpepolyfittings" },
  63: { faceToFaceMm: 133, centreToFaceMm: 63, source: "catalogue", sourceId: "hdpepolyfittings" },
  75: { faceToFaceMm: 163, centreToFaceMm: 70, source: "catalogue", sourceId: "hdpepolyfittings" },
  90: { faceToFaceMm: 182, centreToFaceMm: 79, source: "catalogue", sourceId: "hdpepolyfittings" },
  110: { faceToFaceMm: 210, centreToFaceMm: 82, source: "catalogue", sourceId: "hdpepolyfittings" },
  125: { faceToFaceMm: 240, centreToFaceMm: 87, source: "catalogue", sourceId: "hdpepolyfittings" },
  140: { faceToFaceMm: 241, centreToFaceMm: 89, source: "catalogue", sourceId: "hdpepolyfittings" },
  160: { faceToFaceMm: 258, centreToFaceMm: 80, source: "catalogue", sourceId: "hdpepolyfittings" },
  180: {
    faceToFaceMm: 297,
    centreToFaceMm: 105,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  200: { faceToFaceMm: 308, centreToFaceMm: 97, source: "catalogue", sourceId: "hdpepolyfittings" },
  225: {
    faceToFaceMm: 367,
    centreToFaceMm: 120,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  250: {
    faceToFaceMm: 362,
    centreToFaceMm: 100,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  280: {
    faceToFaceMm: 423,
    centreToFaceMm: 139,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  315: {
    faceToFaceMm: 455,
    centreToFaceMm: 125,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  355: {
    faceToFaceMm: 550,
    centreToFaceMm: 155,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  400: {
    faceToFaceMm: 610,
    centreToFaceMm: 160,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  450: {
    faceToFaceMm: 650,
    centreToFaceMm: 155,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  500: {
    faceToFaceMm: 700,
    centreToFaceMm: 155,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  560: {
    faceToFaceMm: 780,
    centreToFaceMm: 165,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  630: {
    faceToFaceMm: 850,
    centreToFaceMm: 170,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  710: {
    faceToFaceMm: 900,
    centreToFaceMm: 170,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  800: {
    faceToFaceMm: 990,
    centreToFaceMm: 170,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
};

const ELBOW_45_DIMS: Record<number, ElbowDims> = {
  50: { faceToFaceMm: 150, centreToFaceMm: 62, source: "catalogue", sourceId: "hdpepolyfittings" },
  63: { faceToFaceMm: 160, centreToFaceMm: 63, source: "catalogue", sourceId: "hdpepolyfittings" },
  75: { faceToFaceMm: 180, centreToFaceMm: 70, source: "catalogue", sourceId: "hdpepolyfittings" },
  90: { faceToFaceMm: 227, centreToFaceMm: 79, source: "catalogue", sourceId: "hdpepolyfittings" },
  110: { faceToFaceMm: 245, centreToFaceMm: 82, source: "catalogue", sourceId: "hdpepolyfittings" },
  125: { faceToFaceMm: 244, centreToFaceMm: 87, source: "catalogue", sourceId: "hdpepolyfittings" },
  140: { faceToFaceMm: 265, centreToFaceMm: 92, source: "catalogue", sourceId: "hdpepolyfittings" },
  160: { faceToFaceMm: 302, centreToFaceMm: 98, source: "catalogue", sourceId: "hdpepolyfittings" },
  180: {
    faceToFaceMm: 340,
    centreToFaceMm: 105,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  200: {
    faceToFaceMm: 355,
    centreToFaceMm: 112,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  225: {
    faceToFaceMm: 390,
    centreToFaceMm: 120,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  250: {
    faceToFaceMm: 405,
    centreToFaceMm: 130,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  280: {
    faceToFaceMm: 460,
    centreToFaceMm: 140,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  315: {
    faceToFaceMm: 505,
    centreToFaceMm: 150,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  355: {
    faceToFaceMm: 530,
    centreToFaceMm: 145,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  400: {
    faceToFaceMm: 580,
    centreToFaceMm: 160,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  450: {
    faceToFaceMm: 650,
    centreToFaceMm: 155,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  500: {
    faceToFaceMm: 735,
    centreToFaceMm: 180,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  560: {
    faceToFaceMm: 760,
    centreToFaceMm: 160,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  630: {
    faceToFaceMm: 820,
    centreToFaceMm: 160,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  710: {
    faceToFaceMm: 690,
    centreToFaceMm: 170,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  800: {
    faceToFaceMm: 720,
    centreToFaceMm: 170,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
};

// HDPE moulded-elbow dimensions for the standard butt-fusion catalogue
// angles. Returns null when the (angle, DN) combination isn't openly
// catalogued. For 22.5° / 11.25° (rare in SA mining) the function
// returns null — caller should fall back to the steel-equivalent
// formula `R × tan(θ/2)` for fabricated bends at those angles.
export const moulededHdpeElbowDimensions = (angleDeg: number, dnMm: number): ElbowDims | null => {
  if (angleDeg === 90) {
    const dims = ELBOW_90_DIMS[dnMm];
    return dims ?? null;
  }
  if (angleDeg === 45) {
    const dims = ELBOW_45_DIMS[dnMm];
    return dims ?? null;
  }
  return null;
};
