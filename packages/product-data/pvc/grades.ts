// PVC grade definitions per SANS 966 family. Mirrors the HDPE
// `grades.ts` shape so callers can iterate either polymer family
// with the same key shape. Reference data lifted from Flo-Tek,
// Marley, Macneil, Sizabantu, Agrico, and DPI Trading manufacturer
// catalogues — SANS standard numbers are referenced by name only,
// no SANS tables reproduced verbatim (per legal posture in
// MEMORY.md → legal_sans_pvc_reproduction_rights.md).

export type PvcGradeCode = "PVC-U" | "PVC-M" | "PVC-O";

export type PvcApplication =
  | "water"
  | "sewer"
  | "drainage"
  | "irrigation"
  | "industrial"
  | "mining";

export interface PvcGrade {
  code: PvcGradeCode;
  name: string;
  // Minimum required strength (MPa). Hoop stress that a 50-year
  // 95% lower confidence limit pipe of this grade can sustain at
  // 20 °C. Drives pipe wall thickness calc per SANS 966.
  mrsMpa: number;
  // Design (allowable) hoop stress at 20 °C. Equals MRS / safety
  // factor (typically 2.0 for cold water — SANS 966).
  designStressMpa: number;
  densityKgM3: number;
  // Max continuous service temperature in °C. PVC-U is the lowest
  // (~60 °C); PVC-M and PVC-O run slightly higher in some
  // catalogues but the practical limit stays ~60 °C for sustained
  // service.
  maxContinuousTempC: number;
  // Typical lifespan window — Flo-Tek and Marley datasheets quote
  // 50–100 years on properly installed buried pipe.
  lifespanYears: { min: number; max: number };
  applications: PvcApplication[];
  // Catalogue-referenced colour conventions (water = blue,
  // sewer/drainage = brown/charcoal, industrial = grey/black).
  colorOptions: string[];
  // SANS / ISO standard numbers — referenced by name only, NEVER
  // verbatim text from those standards.
  specifications: string[];
  description: string;
}

// SANS 966 family uses a safety factor of 2.0 for cold water
// service (20 °C / 50-year design). PVC-O grades are sometimes
// quoted at SF = 1.4 in manufacturer literature because of their
// higher MRS, but we keep 2.0 here for conservative quote sizing
// — engineers can override per project.
const PVC_SAFETY_FACTOR = 2.0;

export const PVC_GRADES: Record<PvcGradeCode, PvcGrade> = {
  "PVC-U": {
    code: "PVC-U",
    name: "PVC-U (Unplasticised PVC)",
    mrsMpa: 25,
    designStressMpa: 25 / PVC_SAFETY_FACTOR,
    densityKgM3: 1400,
    maxContinuousTempC: 60,
    lifespanYears: { min: 50, max: 100 },
    applications: ["water", "sewer", "drainage", "irrigation", "industrial"],
    colorOptions: ["blue", "brown", "grey", "white"],
    specifications: ["SANS 966-1", "ISO 1452"],
    description:
      "Standard rigid PVC for cold-water pressure pipe and drainage. Most common SA polymer for municipal water and irrigation. Solvent-weld, RRJ, or flanged joints depending on size.",
  },
  "PVC-M": {
    code: "PVC-M",
    name: "PVC-M (Modified / Impact-Modified PVC)",
    mrsMpa: 28,
    designStressMpa: 28 / PVC_SAFETY_FACTOR,
    densityKgM3: 1420,
    maxContinuousTempC: 60,
    lifespanYears: { min: 50, max: 100 },
    applications: ["water", "irrigation", "industrial", "mining"],
    colorOptions: ["blue", "grey"],
    specifications: ["SANS 966-2", "ISO 1452"],
    description:
      "Acrylic-modified PVC with higher toughness and impact resistance than PVC-U. Preferred for above-ground exposure, areas with ground movement, and high-traffic burial.",
  },
  "PVC-O": {
    code: "PVC-O",
    name: "PVC-O (Molecularly Oriented PVC)",
    mrsMpa: 45,
    designStressMpa: 45 / PVC_SAFETY_FACTOR,
    densityKgM3: 1400,
    maxContinuousTempC: 45,
    lifespanYears: { min: 100, max: 100 },
    applications: ["water", "mining", "industrial"],
    colorOptions: ["blue"],
    specifications: ["SANS 966-3", "ISO 16422"],
    description:
      "Bi-axially oriented PVC with hoop stress comparable to ductile iron. Highest-performance PVC family — thinner wall for the same pressure rating, superior fatigue and impact resistance. Used for high-pressure water mains and trenchless installs.",
  },
};

export const PVC_GRADE_LIST: PvcGradeCode[] = ["PVC-U", "PVC-M", "PVC-O"];

export const pvcGradeByCode = (code: PvcGradeCode): PvcGrade => PVC_GRADES[code];

export const pvcGradesByApplication = (application: PvcApplication): PvcGrade[] =>
  PVC_GRADE_LIST.map((code) => PVC_GRADES[code]).filter((grade) =>
    grade.applications.includes(application),
  );

export const pvcSafetyFactor = (): number => PVC_SAFETY_FACTOR;
