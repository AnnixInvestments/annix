// HDPE PE100 SDR 11 butt-fusion fitting dimensions, sourced from
// publicly-published manufacturer catalogues (HdpePolyfittings,
// Chuangrong) and cross-checked against SA suppliers (Flo-Tek and
// Sinvac confirm product range; their brochures don't tabulate per-DN
// values). Values converge across sources to within ~5%; gaps in
// published data are returned as null rather than fabricated.
//
// Used by the BOQ row builder as a fallback when entry.specs hasn't
// been populated by the manual RFQ form. Per-row specs always win
// when present (the customer may have overridden) — the table is the
// safety net for Nix-extracted entries that lack explicit geometry.

export interface ElbowDims {
  // Face-to-face (mm) — total length of the moulded elbow body.
  faceToFaceMm: number;
  // Face-to-centre (mm) — distance from spigot face to bend
  // centreline intersection. The "C/F" dimension on a BOQ row.
  centreToFaceMm: number;
}

export interface TeeDims {
  // Run face-to-face (mm) — total length of the run section.
  runFaceToFaceMm: number;
  // Branch face-to-centre (mm) — distance from branch face to the
  // run centreline.
  branchFaceToCentreMm: number;
}

const ELBOW_90_DIMS: Record<number, ElbowDims> = {
  50: { faceToFaceMm: 120, centreToFaceMm: 66 },
  63: { faceToFaceMm: 133, centreToFaceMm: 63 },
  75: { faceToFaceMm: 163, centreToFaceMm: 70 },
  90: { faceToFaceMm: 182, centreToFaceMm: 79 },
  110: { faceToFaceMm: 210, centreToFaceMm: 82 },
  125: { faceToFaceMm: 240, centreToFaceMm: 87 },
  140: { faceToFaceMm: 241, centreToFaceMm: 89 },
  160: { faceToFaceMm: 258, centreToFaceMm: 80 },
  180: { faceToFaceMm: 297, centreToFaceMm: 105 },
  200: { faceToFaceMm: 308, centreToFaceMm: 97 },
  225: { faceToFaceMm: 367, centreToFaceMm: 120 },
  250: { faceToFaceMm: 362, centreToFaceMm: 100 },
  280: { faceToFaceMm: 423, centreToFaceMm: 139 },
  315: { faceToFaceMm: 455, centreToFaceMm: 125 },
  355: { faceToFaceMm: 550, centreToFaceMm: 155 },
  400: { faceToFaceMm: 610, centreToFaceMm: 160 },
  450: { faceToFaceMm: 650, centreToFaceMm: 155 },
  500: { faceToFaceMm: 700, centreToFaceMm: 155 },
  560: { faceToFaceMm: 780, centreToFaceMm: 165 },
  630: { faceToFaceMm: 850, centreToFaceMm: 170 },
  710: { faceToFaceMm: 900, centreToFaceMm: 170 },
  800: { faceToFaceMm: 990, centreToFaceMm: 170 },
};

const ELBOW_45_DIMS: Record<number, ElbowDims> = {
  50: { faceToFaceMm: 150, centreToFaceMm: 62 },
  63: { faceToFaceMm: 160, centreToFaceMm: 63 },
  75: { faceToFaceMm: 180, centreToFaceMm: 70 },
  90: { faceToFaceMm: 227, centreToFaceMm: 79 },
  110: { faceToFaceMm: 245, centreToFaceMm: 82 },
  125: { faceToFaceMm: 244, centreToFaceMm: 87 },
  140: { faceToFaceMm: 265, centreToFaceMm: 92 },
  160: { faceToFaceMm: 302, centreToFaceMm: 98 },
  180: { faceToFaceMm: 340, centreToFaceMm: 105 },
  200: { faceToFaceMm: 355, centreToFaceMm: 112 },
  225: { faceToFaceMm: 390, centreToFaceMm: 120 },
  250: { faceToFaceMm: 405, centreToFaceMm: 130 },
  280: { faceToFaceMm: 460, centreToFaceMm: 140 },
  315: { faceToFaceMm: 505, centreToFaceMm: 150 },
  355: { faceToFaceMm: 530, centreToFaceMm: 145 },
  400: { faceToFaceMm: 580, centreToFaceMm: 160 },
  450: { faceToFaceMm: 650, centreToFaceMm: 155 },
  500: { faceToFaceMm: 735, centreToFaceMm: 180 },
  560: { faceToFaceMm: 760, centreToFaceMm: 160 },
  630: { faceToFaceMm: 820, centreToFaceMm: 160 },
  710: { faceToFaceMm: 690, centreToFaceMm: 170 },
  800: { faceToFaceMm: 720, centreToFaceMm: 170 },
};

const TEE_EQUAL_DIMS: Record<number, TeeDims> = {
  50: { runFaceToFaceMm: 170, branchFaceToCentreMm: 87 },
  63: { runFaceToFaceMm: 203, branchFaceToCentreMm: 104 },
  75: { runFaceToFaceMm: 230, branchFaceToCentreMm: 118 },
  90: { runFaceToFaceMm: 263, branchFaceToCentreMm: 134 },
  110: { runFaceToFaceMm: 295, branchFaceToCentreMm: 145 },
  125: { runFaceToFaceMm: 315, branchFaceToCentreMm: 163 },
  140: { runFaceToFaceMm: 345, branchFaceToCentreMm: 178 },
  160: { runFaceToFaceMm: 325, branchFaceToCentreMm: 169 },
  180: { runFaceToFaceMm: 437, branchFaceToCentreMm: 225 },
  200: { runFaceToFaceMm: 380, branchFaceToCentreMm: 200 },
  225: { runFaceToFaceMm: 502, branchFaceToCentreMm: 247 },
  250: { runFaceToFaceMm: 500, branchFaceToCentreMm: 263 },
  280: { runFaceToFaceMm: 490, branchFaceToCentreMm: 255 },
  315: { runFaceToFaceMm: 600, branchFaceToCentreMm: 300 },
  355: { runFaceToFaceMm: 722, branchFaceToCentreMm: 360 },
  400: { runFaceToFaceMm: 720, branchFaceToCentreMm: 377 },
};

const TEE_REDUCING_DIMS: Record<string, TeeDims> = {
  "63x25": { runFaceToFaceMm: 110, branchFaceToCentreMm: 129 },
  "63x32": { runFaceToFaceMm: 110, branchFaceToCentreMm: 129 },
  "90x25": { runFaceToFaceMm: 140, branchFaceToCentreMm: 185 },
  "90x50": { runFaceToFaceMm: 140, branchFaceToCentreMm: 185 },
  "90x63": { runFaceToFaceMm: 140, branchFaceToCentreMm: 185 },
  "110x20": { runFaceToFaceMm: 130, branchFaceToCentreMm: 145 },
  "110x25": { runFaceToFaceMm: 130, branchFaceToCentreMm: 145 },
  "110x32": { runFaceToFaceMm: 130, branchFaceToCentreMm: 145 },
  "110x50": { runFaceToFaceMm: 145, branchFaceToCentreMm: 175 },
  "110x63": { runFaceToFaceMm: 145, branchFaceToCentreMm: 175 },
  "160x63": { runFaceToFaceMm: 190, branchFaceToCentreMm: 225 },
  "160x90": { runFaceToFaceMm: 190, branchFaceToCentreMm: 225 },
  "200x63": { runFaceToFaceMm: 190, branchFaceToCentreMm: 215 },
  "200x90": { runFaceToFaceMm: 190, branchFaceToCentreMm: 215 },
  "250x63": { runFaceToFaceMm: 190, branchFaceToCentreMm: 215 },
  "250x90": { runFaceToFaceMm: 190, branchFaceToCentreMm: 215 },
  "315x63": { runFaceToFaceMm: 190, branchFaceToCentreMm: 215 },
  "315x90": { runFaceToFaceMm: 190, branchFaceToCentreMm: 215 },
};

// End-to-end length (mm) for concentric AND eccentric reducers.
// Per ISO 4427-3 and every published catalogue checked, eccentric
// reducer length matches concentric at the same DN×branchDN. Keyed
// by `${largerDn}x${smallerDn}`.
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

// HDPE moulded-elbow dimensions for the standard butt-fusion catalogue
// angles. Returns null when the (angle, DN) combination isn't openly
// catalogued. For 22.5° / 11.25° (rare in SA mining) the function
// returns null — caller should fall back to the steel-equivalent
// formula `R × tan(θ/2)` for fabricated bends at those angles.
//
// SA mining context: bends ≥ DN 250 are fabricated mitre bends sized
// BY the formula (no catalogue table exists), and bends ≤ DN 200 are
// moulded — the formula deviates up to 27% at DN 110 dropping to ~3%
// at DN 200. The take-off should prefer the catalogue value for
// moulded sizes and fall through to the formula for fabricated ones.
export const moulededHdpeElbowDimensions = (angleDeg: number, dnMm: number): ElbowDims | null => {
  if (angleDeg === 90) return ELBOW_90_DIMS[dnMm] ?? null;
  if (angleDeg === 45) return ELBOW_45_DIMS[dnMm] ?? null;
  return null;
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

// Concentric / eccentric reducer end-to-end length (mm). Returns null
// when the (mainDN, branchDN) pair isn't catalogued. Direction-
// agnostic — works whether you pass (250, 160) or (160, 250).
export const hdpeReducerLength = (dnAMm: number, dnBMm: number): number | null => {
  if (dnAMm === dnBMm) return null;
  const key = reducerKey(dnAMm, dnBMm);
  const length = REDUCER_LENGTH_MM[key];
  return length ?? null;
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
