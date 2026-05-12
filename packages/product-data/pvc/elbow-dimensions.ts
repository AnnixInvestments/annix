// PVC injection-moulded elbow centre-to-face (Z) dimensions, mm.
//
// Source: SANS 1601 fitting range as published in Marley / Macneil /
// DPI catalogues. Dimensions are nominal — SANS 1601 sets a ±2 mm
// manufacturing tolerance which we don't represent here. SANS table
// data NOT reproduced verbatim per the legal posture documented in
// `MEMORY.md → legal_sans_pvc_reproduction_rights.md`.
//
// Coverage: DN 20 – 160 (SANS 1601 injection-moulded range). Larger
// elbows (DN ≥ 200) are site-fabricated from cut pipe segments —
// dimensions vary by job and are not tabulated here.

import { pvcCatalogueSource } from "./sources";

export type PvcElbowAngle = 11.25 | 22.5 | 45 | 90;

export interface PvcElbowDimension {
  dnMm: number;
  angle: PvcElbowAngle;
  // Centre-to-face length, mm. Distance from elbow centreline to the
  // mating face of the socket (the "Z" dimension on data sheets).
  centerToFaceMm: number;
  // Reference catalogue id from `sources.ts`.
  sourceId: string;
  // True when the value is interpolated from a catalogue trend rather
  // than directly tabulated. Supplier should confirm at quote.
  estimated?: boolean;
}

// 90° elbows — full short-radius pattern (SANS 1601 injection-moulded).
const ELBOW_90: PvcElbowDimension[] = [
  { dnMm: 20, angle: 90, centerToFaceMm: 22, sourceId: "marley-product-catalogue" },
  { dnMm: 25, angle: 90, centerToFaceMm: 26, sourceId: "marley-product-catalogue" },
  { dnMm: 32, angle: 90, centerToFaceMm: 31, sourceId: "marley-product-catalogue" },
  { dnMm: 40, angle: 90, centerToFaceMm: 37, sourceId: "marley-product-catalogue" },
  { dnMm: 50, angle: 90, centerToFaceMm: 44, sourceId: "marley-product-catalogue" },
  { dnMm: 63, angle: 90, centerToFaceMm: 53, sourceId: "marley-product-catalogue" },
  { dnMm: 75, angle: 90, centerToFaceMm: 62, sourceId: "macneil-2025-catalogue" },
  { dnMm: 90, angle: 90, centerToFaceMm: 73, sourceId: "macneil-2025-catalogue" },
  { dnMm: 110, angle: 90, centerToFaceMm: 88, sourceId: "macneil-2025-catalogue" },
  { dnMm: 125, angle: 90, centerToFaceMm: 99, sourceId: "macneil-2025-catalogue" },
  {
    dnMm: 140,
    angle: 90,
    centerToFaceMm: 109,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
  { dnMm: 160, angle: 90, centerToFaceMm: 124, sourceId: "macneil-2025-catalogue" },
];

// 45° elbows.
const ELBOW_45: PvcElbowDimension[] = [
  { dnMm: 20, angle: 45, centerToFaceMm: 16, sourceId: "marley-product-catalogue" },
  { dnMm: 25, angle: 45, centerToFaceMm: 18, sourceId: "marley-product-catalogue" },
  { dnMm: 32, angle: 45, centerToFaceMm: 21, sourceId: "marley-product-catalogue" },
  { dnMm: 40, angle: 45, centerToFaceMm: 24, sourceId: "marley-product-catalogue" },
  { dnMm: 50, angle: 45, centerToFaceMm: 28, sourceId: "marley-product-catalogue" },
  { dnMm: 63, angle: 45, centerToFaceMm: 33, sourceId: "marley-product-catalogue" },
  { dnMm: 75, angle: 45, centerToFaceMm: 38, sourceId: "macneil-2025-catalogue" },
  { dnMm: 90, angle: 45, centerToFaceMm: 45, sourceId: "macneil-2025-catalogue" },
  { dnMm: 110, angle: 45, centerToFaceMm: 53, sourceId: "macneil-2025-catalogue" },
  { dnMm: 125, angle: 45, centerToFaceMm: 60, sourceId: "macneil-2025-catalogue" },
  { dnMm: 140, angle: 45, centerToFaceMm: 66, sourceId: "macneil-2025-catalogue", estimated: true },
  { dnMm: 160, angle: 45, centerToFaceMm: 75, sourceId: "macneil-2025-catalogue" },
];

// 22.5° elbows (rarely stocked > DN 110 — fabricated for larger).
const ELBOW_22_5: PvcElbowDimension[] = [
  {
    dnMm: 50,
    angle: 22.5,
    centerToFaceMm: 22,
    sourceId: "marley-product-catalogue",
    estimated: true,
  },
  {
    dnMm: 63,
    angle: 22.5,
    centerToFaceMm: 25,
    sourceId: "marley-product-catalogue",
    estimated: true,
  },
  {
    dnMm: 75,
    angle: 22.5,
    centerToFaceMm: 28,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
  {
    dnMm: 90,
    angle: 22.5,
    centerToFaceMm: 32,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
  {
    dnMm: 110,
    angle: 22.5,
    centerToFaceMm: 37,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
];

// 11.25° elbows (uncommon; typically fabricated).
const ELBOW_11_25: PvcElbowDimension[] = [
  {
    dnMm: 110,
    angle: 11.25,
    centerToFaceMm: 30,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
];

export const PVC_ELBOW_DIMENSIONS: PvcElbowDimension[] = [
  ...ELBOW_90,
  ...ELBOW_45,
  ...ELBOW_22_5,
  ...ELBOW_11_25,
];

export const pvcElbowDimension = (dnMm: number, angle: PvcElbowAngle): PvcElbowDimension | null =>
  PVC_ELBOW_DIMENSIONS.find((e) => e.dnMm === dnMm && e.angle === angle) ?? null;

export const pvcElbowSource = (entry: PvcElbowDimension) => pvcCatalogueSource(entry.sourceId);
