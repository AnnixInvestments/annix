// PVC flange-adapter dimensions. A flange adapter is a PVC stub /
// slip-on collar paired with a loose SANS 1123 backing flange so the
// system can land on a steel-flanged valve, pump or vessel.
//
// Length is the body length from the spigot socket to the flange
// face. Backing-flange weight + bolting come from the existing
// SANS 1123 lookup shared with HDPE — don't duplicate it here.

import { pvcCatalogueSource } from "./sources";

export interface PvcFlangeAdapterDimension {
  dnMm: number;
  // Body length from socket back-stop to flange face, mm.
  bodyLengthMm: number;
  // OD at the flange face — matches the SANS 1123 table OD for the
  // backing flange in the chosen pressure class. Cached here so the
  // BOQ description can render the full collar geometry without a
  // second lookup.
  flangeFaceOdMm: number;
  sourceId: string;
  estimated?: boolean;
}

export const PVC_FLANGE_ADAPTER_DIMENSIONS: PvcFlangeAdapterDimension[] = [
  { dnMm: 50, bodyLengthMm: 80, flangeFaceOdMm: 165, sourceId: "marley-product-catalogue" },
  { dnMm: 63, bodyLengthMm: 90, flangeFaceOdMm: 185, sourceId: "marley-product-catalogue" },
  { dnMm: 75, bodyLengthMm: 100, flangeFaceOdMm: 200, sourceId: "marley-product-catalogue" },
  { dnMm: 90, bodyLengthMm: 110, flangeFaceOdMm: 220, sourceId: "marley-product-catalogue" },
  { dnMm: 110, bodyLengthMm: 125, flangeFaceOdMm: 240, sourceId: "marley-product-catalogue" },
  { dnMm: 125, bodyLengthMm: 135, flangeFaceOdMm: 250, sourceId: "macneil-2025-catalogue" },
  {
    dnMm: 140,
    bodyLengthMm: 145,
    flangeFaceOdMm: 270,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
  { dnMm: 160, bodyLengthMm: 155, flangeFaceOdMm: 285, sourceId: "macneil-2025-catalogue" },
  { dnMm: 200, bodyLengthMm: 180, flangeFaceOdMm: 340, sourceId: "flo-tek-upvc-pressure" },
  {
    dnMm: 225,
    bodyLengthMm: 195,
    flangeFaceOdMm: 360,
    sourceId: "flo-tek-upvc-pressure",
    estimated: true,
  },
  { dnMm: 250, bodyLengthMm: 210, flangeFaceOdMm: 395, sourceId: "flo-tek-upvc-pressure" },
  {
    dnMm: 280,
    bodyLengthMm: 230,
    flangeFaceOdMm: 430,
    sourceId: "flo-tek-upvc-pressure",
    estimated: true,
  },
  { dnMm: 315, bodyLengthMm: 250, flangeFaceOdMm: 460, sourceId: "flo-tek-upvc-pressure" },
  {
    dnMm: 355,
    bodyLengthMm: 275,
    flangeFaceOdMm: 500,
    sourceId: "flo-tek-upvc-pressure",
    estimated: true,
  },
  { dnMm: 400, bodyLengthMm: 300, flangeFaceOdMm: 555, sourceId: "flo-tek-upvc-pressure" },
  {
    dnMm: 450,
    bodyLengthMm: 320,
    flangeFaceOdMm: 605,
    sourceId: "flo-tek-upvc-pressure",
    estimated: true,
  },
  {
    dnMm: 500,
    bodyLengthMm: 340,
    flangeFaceOdMm: 670,
    sourceId: "flo-tek-upvc-pressure",
    estimated: true,
  },
];

export const pvcFlangeAdapterDimension = (dnMm: number): PvcFlangeAdapterDimension | null =>
  PVC_FLANGE_ADAPTER_DIMENSIONS.find((d) => d.dnMm === dnMm) ?? null;

export const pvcFlangeAdapterSource = (entry: PvcFlangeAdapterDimension) =>
  pvcCatalogueSource(entry.sourceId);
