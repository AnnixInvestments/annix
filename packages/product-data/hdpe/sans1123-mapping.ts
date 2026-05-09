import type { PnClass } from "./sdr-ratings";

export type Sans1123TableNumber = "T600/3" | "T1000/3" | "T1600/3" | "T2500/3" | "T4000/3";

export type Sans1123FlangeFace = "Type 1" | "Type 2" | "Type 3";

export interface Sans1123BackingFlangeSpec {
  table: Sans1123TableNumber;
  faceType: Sans1123FlangeFace;
  ratedKpa: number;
  ratedBar: number;
  description: string;
}

const PN_TO_SANS1123: Record<number, Sans1123BackingFlangeSpec> = {
  6: {
    table: "T600/3",
    faceType: "Type 1",
    ratedKpa: 600,
    ratedBar: 6,
    description: "SANS 1123 Table 600/3 Type 1 (full-face) backing flange",
  },
  10: {
    table: "T1000/3",
    faceType: "Type 1",
    ratedKpa: 1000,
    ratedBar: 10,
    description: "SANS 1123 Table 1000/3 Type 1 (full-face) backing flange",
  },
  16: {
    table: "T1600/3",
    faceType: "Type 1",
    ratedKpa: 1600,
    ratedBar: 16,
    description: "SANS 1123 Table 1600/3 Type 1 (full-face) backing flange",
  },
  25: {
    table: "T2500/3",
    faceType: "Type 1",
    ratedKpa: 2500,
    ratedBar: 25,
    description: "SANS 1123 Table 2500/3 Type 1 (full-face) backing flange",
  },
  40: {
    table: "T4000/3",
    faceType: "Type 1",
    ratedKpa: 4000,
    ratedBar: 40,
    description: "SANS 1123 Table 4000/3 Type 1 (full-face) backing flange",
  },
};

const SUPPORTED_PNS = [6, 10, 16, 25, 40];

export const sans1123BackingFlange = (
  pnBar: number | PnClass | null | undefined,
): Sans1123BackingFlangeSpec | null => {
  if (pnBar == null) return null;
  const pn = typeof pnBar === "string" ? parseFloat(pnBar) : pnBar;
  if (!Number.isFinite(pn) || pn <= 0) return null;
  const matched = PN_TO_SANS1123[pn];
  if (matched) return matched;
  const next = SUPPORTED_PNS.find((p) => p >= pn);
  if (next) return PN_TO_SANS1123[next];
  return PN_TO_SANS1123[40];
};

export const sans1123StubAssemblyDescription = (
  pnBar: number | PnClass | null | undefined,
): string | null => {
  const spec = sans1123BackingFlange(pnBar);
  if (!spec) return null;
  return `c/w stub end + ${spec.description}`;
};
