// PVC couplings — slip / solvent-weld, rubber-ring (RRJ) and repair
// patterns. Length is the overall body length socket-to-socket.
//
// Three families:
//   - solvent (slip) couplings — SANS 1601, DN 20–160, solvent-weld
//     both ends.
//   - rubber-ring couplings (RRJ) — DN 50–630, integral elastomer
//     sealed sockets both ends.
//   - repair / slide-on couplings — split-pattern couplings for
//     mid-pipe joins without cutting the run. Manufacturer-specific
//     (Plasson, Philmac); body length matches the slip family.

import { pvcCatalogueSource } from "./sources";

export type PvcCouplingFamily = "slip" | "rrj" | "repair";

export interface PvcCouplingDimension {
  dnMm: number;
  family: PvcCouplingFamily;
  // Overall body length, mm.
  lengthMm: number;
  sourceId: string;
  estimated?: boolean;
}

const SLIP_COUPLINGS: PvcCouplingDimension[] = [
  { dnMm: 20, family: "slip", lengthMm: 44, sourceId: "marley-product-catalogue" },
  { dnMm: 25, family: "slip", lengthMm: 50, sourceId: "marley-product-catalogue" },
  { dnMm: 32, family: "slip", lengthMm: 58, sourceId: "marley-product-catalogue" },
  { dnMm: 40, family: "slip", lengthMm: 68, sourceId: "marley-product-catalogue" },
  { dnMm: 50, family: "slip", lengthMm: 80, sourceId: "marley-product-catalogue" },
  { dnMm: 63, family: "slip", lengthMm: 94, sourceId: "marley-product-catalogue" },
  { dnMm: 75, family: "slip", lengthMm: 108, sourceId: "macneil-2025-catalogue" },
  { dnMm: 90, family: "slip", lengthMm: 126, sourceId: "macneil-2025-catalogue" },
  { dnMm: 110, family: "slip", lengthMm: 150, sourceId: "macneil-2025-catalogue" },
  { dnMm: 125, family: "slip", lengthMm: 168, sourceId: "macneil-2025-catalogue" },
  { dnMm: 160, family: "slip", lengthMm: 210, sourceId: "macneil-2025-catalogue" },
];

const RRJ_COUPLINGS: PvcCouplingDimension[] = [
  { dnMm: 50, family: "rrj", lengthMm: 110, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 63, family: "rrj", lengthMm: 125, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 75, family: "rrj", lengthMm: 140, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 90, family: "rrj", lengthMm: 160, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 110, family: "rrj", lengthMm: 185, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 125, family: "rrj", lengthMm: 205, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 140, family: "rrj", lengthMm: 220, sourceId: "flo-tek-upvc-pressure", estimated: true },
  { dnMm: 160, family: "rrj", lengthMm: 240, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 200, family: "rrj", lengthMm: 280, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 250, family: "rrj", lengthMm: 330, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 315, family: "rrj", lengthMm: 400, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 355, family: "rrj", lengthMm: 440, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 400, family: "rrj", lengthMm: 490, sourceId: "flo-tek-upvc-pressure" },
  { dnMm: 450, family: "rrj", lengthMm: 540, sourceId: "flo-tek-upvc-pressure", estimated: true },
  { dnMm: 500, family: "rrj", lengthMm: 590, sourceId: "flo-tek-upvc-pressure", estimated: true },
  { dnMm: 630, family: "rrj", lengthMm: 700, sourceId: "flo-tek-upvc-pressure", estimated: true },
];

const REPAIR_COUPLINGS: PvcCouplingDimension[] = [
  { dnMm: 50, family: "repair", lengthMm: 150, sourceId: "dpi-trading-pvc", estimated: true },
  { dnMm: 63, family: "repair", lengthMm: 160, sourceId: "dpi-trading-pvc", estimated: true },
  { dnMm: 75, family: "repair", lengthMm: 180, sourceId: "dpi-trading-pvc", estimated: true },
  { dnMm: 90, family: "repair", lengthMm: 200, sourceId: "dpi-trading-pvc", estimated: true },
  { dnMm: 110, family: "repair", lengthMm: 220, sourceId: "dpi-trading-pvc", estimated: true },
  { dnMm: 160, family: "repair", lengthMm: 280, sourceId: "dpi-trading-pvc", estimated: true },
];

export const PVC_COUPLING_DIMENSIONS: PvcCouplingDimension[] = [
  ...SLIP_COUPLINGS,
  ...RRJ_COUPLINGS,
  ...REPAIR_COUPLINGS,
];

export const pvcCouplingDimension = (
  dnMm: number,
  family: PvcCouplingFamily,
): PvcCouplingDimension | null =>
  PVC_COUPLING_DIMENSIONS.find((c) => c.dnMm === dnMm && c.family === family) ?? null;

export const pvcCouplingSource = (entry: PvcCouplingDimension) =>
  pvcCatalogueSource(entry.sourceId);
