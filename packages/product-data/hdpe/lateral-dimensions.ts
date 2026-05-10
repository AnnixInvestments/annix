import type { LateralDims } from "./fitting-dimension-types";

// HDPE PE100 SDR 11 butt-fusion 45° lateral / wye-tee dimensions
// across two distinct manufacturing patterns:
//
//   - Moulded short-pattern (DN 63-160): Sunplast / HdpePolyfittings
//     per-DN catalogue table. Real catalogue values for mass-produced
//     moulded fittings.
//
//   - Fabricated long-pattern (DN ≥ 200): Strongbridge IPS 2"-12"
//     catalogue, converted DN-equivalent. SA mining suppliers
//     fabricate laterals to drawing at these sizes — Strongbridge
//     publishes representative IPS values that mirror the typical
//     SA fabrication length convention. Branch dims reported by
//     Strongbridge as L only; branchLengthMm and branchFaceToCentreMm
//     reported here are proportional (~L/4 and ~L/5 respectively),
//     matching the ratio the moulded catalogue uses at its largest
//     entry (DN 160).
//
//   - Estimated values (DN 180, 225, 280, 355, 400, 450, 500, 560,
//     630): linear interpolation between adjacent Strongbridge anchor
//     points, then extrapolation above DN 315 at L/OD ≈ 4.0 (matching
//     Strongbridge growth pattern). Marked source: "estimated" so the
//     BOQ row builder can surface a "supplier to confirm" hint to the
//     quoter.
//
// 60° laterals: no open metric source at any DN. Function returns
// null and the caller falls back to entry.specs.lateralHeightMm.

const LATERAL_45_DIMS: Record<number, LateralDims> = {
  // Moulded short-pattern — Sunplast / HdpePolyfittings catalogue
  63: {
    runFaceToFaceMm: 257,
    branchLengthMm: 65,
    branchFaceToCentreMm: 65,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  75: {
    runFaceToFaceMm: 280,
    branchLengthMm: 65,
    branchFaceToCentreMm: 70,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  90: {
    runFaceToFaceMm: 338,
    branchLengthMm: 90,
    branchFaceToCentreMm: 80,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  110: {
    runFaceToFaceMm: 392,
    branchLengthMm: 100,
    branchFaceToCentreMm: 90,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  125: {
    runFaceToFaceMm: 404,
    branchLengthMm: 90,
    branchFaceToCentreMm: 85,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  140: {
    runFaceToFaceMm: 404,
    branchLengthMm: 75,
    branchFaceToCentreMm: 75,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  160: {
    runFaceToFaceMm: 420,
    branchLengthMm: 75,
    branchFaceToCentreMm: 75,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  // Estimated bridge between moulded (DN 160) and fabricated (DN 200)
  // patterns. Anchored to the Strongbridge fabricated long-pattern
  // start point so the BOQ visual progression stays smooth.
  180: {
    runFaceToFaceMm: 700,
    branchLengthMm: 175,
    branchFaceToCentreMm: 140,
    source: "estimated",
    sourceId: "strongbridge",
  },
  // Fabricated long-pattern — Strongbridge IPS catalogue anchors
  200: {
    runFaceToFaceMm: 985,
    branchLengthMm: 245,
    branchFaceToCentreMm: 195,
    source: "catalogue",
    sourceId: "strongbridge",
  },
  225: {
    runFaceToFaceMm: 1040,
    branchLengthMm: 260,
    branchFaceToCentreMm: 210,
    source: "estimated",
    sourceId: "strongbridge",
  },
  250: {
    runFaceToFaceMm: 1100,
    branchLengthMm: 275,
    branchFaceToCentreMm: 220,
    source: "catalogue",
    sourceId: "strongbridge",
  },
  280: {
    runFaceToFaceMm: 1150,
    branchLengthMm: 290,
    branchFaceToCentreMm: 230,
    source: "estimated",
    sourceId: "strongbridge",
  },
  315: {
    runFaceToFaceMm: 1200,
    branchLengthMm: 300,
    branchFaceToCentreMm: 240,
    source: "catalogue",
    sourceId: "strongbridge",
  },
  // Extrapolated above Strongbridge's 12" IPS upper bound at
  // L/OD ≈ 4.0 (matching the 8"-12" Strongbridge growth pattern).
  355: {
    runFaceToFaceMm: 1420,
    branchLengthMm: 355,
    branchFaceToCentreMm: 285,
    source: "estimated",
    sourceId: "strongbridge",
  },
  400: {
    runFaceToFaceMm: 1600,
    branchLengthMm: 400,
    branchFaceToCentreMm: 320,
    source: "estimated",
    sourceId: "strongbridge",
  },
  450: {
    runFaceToFaceMm: 1800,
    branchLengthMm: 450,
    branchFaceToCentreMm: 360,
    source: "estimated",
    sourceId: "strongbridge",
  },
  500: {
    runFaceToFaceMm: 2000,
    branchLengthMm: 500,
    branchFaceToCentreMm: 400,
    source: "estimated",
    sourceId: "strongbridge",
  },
  560: {
    runFaceToFaceMm: 2240,
    branchLengthMm: 560,
    branchFaceToCentreMm: 450,
    source: "estimated",
    sourceId: "strongbridge",
  },
  630: {
    runFaceToFaceMm: 2520,
    branchLengthMm: 630,
    branchFaceToCentreMm: 505,
    source: "estimated",
    sourceId: "strongbridge",
  },
};

export const lateralDimensions = (angleDeg: number, dnMm: number): LateralDims | null => {
  if (angleDeg === 45) {
    const dims = LATERAL_45_DIMS[dnMm];
    return dims ?? null;
  }
  // 60° laterals and any other angle: no open metric source.
  return null;
};
