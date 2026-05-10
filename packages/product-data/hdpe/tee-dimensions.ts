import type { TeeDims } from "./fitting-dimension-types";

// HDPE PE100 SDR 11 butt-fusion tee body dimensions (run face-to-face
// + branch face-to-centre). Sourced from publicly-published
// manufacturer catalogues (HdpePolyfittings PE100 SDR11/SDR17 equal
// tee table) and cross-checked against SA suppliers (Flo-Tek and
// Sinvac confirm product range; their brochures don't tabulate
// per-DN values).

const TEE_EQUAL_DIMS: Record<number, TeeDims> = {
  50: {
    runFaceToFaceMm: 170,
    branchFaceToCentreMm: 87,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  63: {
    runFaceToFaceMm: 203,
    branchFaceToCentreMm: 104,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  75: {
    runFaceToFaceMm: 230,
    branchFaceToCentreMm: 118,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  90: {
    runFaceToFaceMm: 263,
    branchFaceToCentreMm: 134,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  110: {
    runFaceToFaceMm: 295,
    branchFaceToCentreMm: 145,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  125: {
    runFaceToFaceMm: 315,
    branchFaceToCentreMm: 163,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  140: {
    runFaceToFaceMm: 345,
    branchFaceToCentreMm: 178,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  160: {
    runFaceToFaceMm: 325,
    branchFaceToCentreMm: 169,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  180: {
    runFaceToFaceMm: 437,
    branchFaceToCentreMm: 225,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  200: {
    runFaceToFaceMm: 380,
    branchFaceToCentreMm: 200,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  225: {
    runFaceToFaceMm: 502,
    branchFaceToCentreMm: 247,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  250: {
    runFaceToFaceMm: 500,
    branchFaceToCentreMm: 263,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  280: {
    runFaceToFaceMm: 490,
    branchFaceToCentreMm: 255,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  315: {
    runFaceToFaceMm: 600,
    branchFaceToCentreMm: 300,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  355: {
    runFaceToFaceMm: 722,
    branchFaceToCentreMm: 360,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  400: {
    runFaceToFaceMm: 720,
    branchFaceToCentreMm: 377,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
};

// Reducing-tee dimensions keyed as `${mainDn}x${branchDn}`. Sparse
// catalogue coverage — reducing tees > DN 315 aren't openly published,
// so callers fall back to the equal-tee dimensions for the run plus a
// reducer length for the branch transition.
const TEE_REDUCING_DIMS: Record<string, TeeDims> = {
  "63x25": {
    runFaceToFaceMm: 110,
    branchFaceToCentreMm: 129,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "63x32": {
    runFaceToFaceMm: 110,
    branchFaceToCentreMm: 129,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "90x25": {
    runFaceToFaceMm: 140,
    branchFaceToCentreMm: 185,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "90x50": {
    runFaceToFaceMm: 140,
    branchFaceToCentreMm: 185,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "90x63": {
    runFaceToFaceMm: 140,
    branchFaceToCentreMm: 185,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "110x20": {
    runFaceToFaceMm: 130,
    branchFaceToCentreMm: 145,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "110x25": {
    runFaceToFaceMm: 130,
    branchFaceToCentreMm: 145,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "110x32": {
    runFaceToFaceMm: 130,
    branchFaceToCentreMm: 145,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "110x50": {
    runFaceToFaceMm: 145,
    branchFaceToCentreMm: 175,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "110x63": {
    runFaceToFaceMm: 145,
    branchFaceToCentreMm: 175,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "160x63": {
    runFaceToFaceMm: 190,
    branchFaceToCentreMm: 225,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "160x90": {
    runFaceToFaceMm: 190,
    branchFaceToCentreMm: 225,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "200x63": {
    runFaceToFaceMm: 190,
    branchFaceToCentreMm: 215,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "200x90": {
    runFaceToFaceMm: 190,
    branchFaceToCentreMm: 215,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "250x63": {
    runFaceToFaceMm: 190,
    branchFaceToCentreMm: 215,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "250x90": {
    runFaceToFaceMm: 190,
    branchFaceToCentreMm: 215,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "315x63": {
    runFaceToFaceMm: 190,
    branchFaceToCentreMm: 215,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
  "315x90": {
    runFaceToFaceMm: 190,
    branchFaceToCentreMm: 215,
    source: "catalogue",
    sourceId: "hdpepolyfittings",
  },
};

// Equal-tee body dimensions by DN. Run face-to-face L; branch
// face-to-centre H. Returns null when the DN isn't catalogued.
export const equalTeeDimensions = (dnMm: number): TeeDims | null => {
  const dims = TEE_EQUAL_DIMS[dnMm];
  return dims ?? null;
};

// Reducing-tee body dimensions by (mainDN, branchDN). Looks up the
// canonical "${mainDn}x${branchDn}" key. Returns null when the pair
// isn't catalogued — caller falls back to the equal-tee dimensions
// for the run, plus the reducer length for the branch transition.
export const reducingTeeDimensions = (mainDnMm: number, branchDnMm: number): TeeDims | null => {
  if (mainDnMm === branchDnMm) return equalTeeDimensions(mainDnMm);
  const key = `${mainDnMm}x${branchDnMm}`;
  const dims = TEE_REDUCING_DIMS[key];
  return dims ?? null;
};

// Tee body dimensions on a single call for the BOQ row builder.
// Resolves equal vs reducing automatically based on whether mainDn
// and branchDn match. Returns null when the geometry isn't openly
// catalogued; the caller can then fall back to entry.specs values
// from the manual RFQ form, or omit the suffix entirely.
export const hdpeTeeDimensions = (
  mainDnMm: number,
  branchDnMm: number | null | undefined,
): TeeDims | null => {
  const branch = branchDnMm ?? mainDnMm;
  return reducingTeeDimensions(mainDnMm, branch);
};
