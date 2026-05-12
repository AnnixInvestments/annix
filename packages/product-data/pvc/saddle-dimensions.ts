// PVC service-saddle dimensions. A service saddle clamps onto a
// pressure main and provides a threaded / solvent-weld outlet for
// branch lines (typically house connections off a DN 110–500 main).
//
// Source: Marley / Macneil / DPI catalogue ranges. Dimensions are
// the saddle body length along the main + branch outlet OD. Not all
// main-DN × branch-DN combinations are stocked — listed entries are
// the common SA conventions.

import { pvcCatalogueSource } from "./sources";

export type PvcSaddleOutletType = "solvent_socket" | "threaded_bsp";

export interface PvcSaddleDimension {
  mainDnMm: number;
  branchDnMm: number;
  outletType: PvcSaddleOutletType;
  // Length of the saddle body along the main pipe, mm. Used by the
  // BOQ row builder to surface "saddle body length" alongside the
  // branch size.
  bodyLengthMm: number;
  sourceId: string;
  estimated?: boolean;
}

export const PVC_SADDLE_DIMENSIONS: PvcSaddleDimension[] = [
  // Threaded-outlet saddles — typically used to land house-line
  // BSP connections off a buried main.
  {
    mainDnMm: 110,
    branchDnMm: 20,
    outletType: "threaded_bsp",
    bodyLengthMm: 120,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 110,
    branchDnMm: 25,
    outletType: "threaded_bsp",
    bodyLengthMm: 120,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 110,
    branchDnMm: 32,
    outletType: "threaded_bsp",
    bodyLengthMm: 130,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 160,
    branchDnMm: 25,
    outletType: "threaded_bsp",
    bodyLengthMm: 150,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 160,
    branchDnMm: 32,
    outletType: "threaded_bsp",
    bodyLengthMm: 160,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 160,
    branchDnMm: 40,
    outletType: "threaded_bsp",
    bodyLengthMm: 170,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 200,
    branchDnMm: 25,
    outletType: "threaded_bsp",
    bodyLengthMm: 180,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 200,
    branchDnMm: 40,
    outletType: "threaded_bsp",
    bodyLengthMm: 200,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 250,
    branchDnMm: 40,
    outletType: "threaded_bsp",
    bodyLengthMm: 220,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
  {
    mainDnMm: 250,
    branchDnMm: 50,
    outletType: "threaded_bsp",
    bodyLengthMm: 230,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
  {
    mainDnMm: 315,
    branchDnMm: 50,
    outletType: "threaded_bsp",
    bodyLengthMm: 260,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },

  // Solvent-socket-outlet saddles — branch into the main with a
  // solvent-weld socket so a full pipe-spool can be teed off.
  {
    mainDnMm: 110,
    branchDnMm: 50,
    outletType: "solvent_socket",
    bodyLengthMm: 140,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 110,
    branchDnMm: 63,
    outletType: "solvent_socket",
    bodyLengthMm: 150,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 160,
    branchDnMm: 50,
    outletType: "solvent_socket",
    bodyLengthMm: 170,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 160,
    branchDnMm: 63,
    outletType: "solvent_socket",
    bodyLengthMm: 180,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 160,
    branchDnMm: 75,
    outletType: "solvent_socket",
    bodyLengthMm: 200,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 200,
    branchDnMm: 50,
    outletType: "solvent_socket",
    bodyLengthMm: 200,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 200,
    branchDnMm: 75,
    outletType: "solvent_socket",
    bodyLengthMm: 220,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 250,
    branchDnMm: 75,
    outletType: "solvent_socket",
    bodyLengthMm: 240,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
  {
    mainDnMm: 250,
    branchDnMm: 110,
    outletType: "solvent_socket",
    bodyLengthMm: 280,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
  {
    mainDnMm: 315,
    branchDnMm: 110,
    outletType: "solvent_socket",
    bodyLengthMm: 320,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
  {
    mainDnMm: 400,
    branchDnMm: 110,
    outletType: "solvent_socket",
    bodyLengthMm: 360,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
  {
    mainDnMm: 500,
    branchDnMm: 110,
    outletType: "solvent_socket",
    bodyLengthMm: 420,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
];

export const pvcSaddleDimension = (
  mainDnMm: number,
  branchDnMm: number,
  outletType: PvcSaddleOutletType,
): PvcSaddleDimension | null =>
  PVC_SADDLE_DIMENSIONS.find(
    (s) => s.mainDnMm === mainDnMm && s.branchDnMm === branchDnMm && s.outletType === outletType,
  ) ?? null;

export const pvcSaddleSource = (entry: PvcSaddleDimension) => pvcCatalogueSource(entry.sourceId);
