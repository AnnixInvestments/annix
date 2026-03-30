export type FittingStandardCode = "SABS62" | "SABS719" | "ASME_B16_9" | "ASME_B16_11" | "BS_143";

export interface FittingStandardMeta {
  code: FittingStandardCode;
  name: string;
  description: string;
  minNbMm: number;
  maxNbMm: number;
  sizes: readonly number[];
  classes: readonly (string | number)[] | null;
  schedules: readonly string[] | null;
}

export const ASME_B16_9_SIZES = [
  15, 20, 25, 32, 40, 50, 65, 80, 90, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
] as const;

export const ASME_B16_11_SIZES = [6, 8, 10, 15, 20, 25, 32, 40, 50, 65, 80, 100] as const;

export const BS_143_SIZES = [6, 8, 10, 15, 20, 25, 32, 40, 50, 65, 80, 100] as const;

export type AsmeB169FittingTypeCode =
  | "ELBOW_90_LR"
  | "ELBOW_90_SR"
  | "ELBOW_45_LR"
  | "STRAIGHT_TEE"
  | "CON_REDUCER"
  | "ECC_REDUCER"
  | "CAP";

export const ASME_B16_9_FITTING_TYPES: { code: AsmeB169FittingTypeCode; name: string }[] = [
  { code: "ELBOW_90_LR", name: "90° Long Radius Elbow" },
  { code: "ELBOW_90_SR", name: "90° Short Radius Elbow" },
  { code: "ELBOW_45_LR", name: "45° Long Radius Elbow" },
  { code: "STRAIGHT_TEE", name: "Straight Tee" },
  { code: "CON_REDUCER", name: "Concentric Reducer" },
  { code: "ECC_REDUCER", name: "Eccentric Reducer" },
  { code: "CAP", name: "Cap" },
];

export type AsmeB1611FittingTypeCode =
  | "ELBOW_90"
  | "ELBOW_45"
  | "TEE"
  | "CROSS"
  | "COUPLING"
  | "HALF_COUPLING"
  | "CAP"
  | "UNION";

export const ASME_B16_11_FITTING_TYPES: { code: AsmeB1611FittingTypeCode; name: string }[] = [
  { code: "ELBOW_90", name: "90° Elbow" },
  { code: "ELBOW_45", name: "45° Elbow" },
  { code: "TEE", name: "Tee" },
  { code: "CROSS", name: "Cross" },
  { code: "COUPLING", name: "Full Coupling" },
  { code: "HALF_COUPLING", name: "Half Coupling" },
  { code: "CAP", name: "Cap" },
  { code: "UNION", name: "Union" },
];

export type Bs143FittingTypeCode =
  | "ELBOW_90"
  | "ELBOW_45"
  | "STREET_ELBOW_90"
  | "STREET_ELBOW_45"
  | "TEE"
  | "REDUCING_TEE"
  | "CROSS"
  | "COUPLING"
  | "REDUCING_COUPLING"
  | "CAP"
  | "UNION"
  | "NIPPLE"
  | "BUSHING";

export const BS_143_FITTING_TYPES: { code: Bs143FittingTypeCode; name: string }[] = [
  { code: "ELBOW_90", name: "90° Elbow" },
  { code: "ELBOW_45", name: "45° Elbow" },
  { code: "STREET_ELBOW_90", name: "90° Street Elbow" },
  { code: "STREET_ELBOW_45", name: "45° Street Elbow" },
  { code: "TEE", name: "Equal Tee" },
  { code: "REDUCING_TEE", name: "Reducing Tee" },
  { code: "CROSS", name: "Cross" },
  { code: "COUPLING", name: "Coupling" },
  { code: "REDUCING_COUPLING", name: "Reducing Coupling" },
  { code: "CAP", name: "Cap" },
  { code: "UNION", name: "Union" },
  { code: "NIPPLE", name: "Nipple" },
  { code: "BUSHING", name: "Bushing" },
];

export const ASME_B16_11_CLASSES = [2000, 3000, 6000, 9000] as const;
export const BS_143_CLASSES = [150, 300] as const;
export const ASME_B16_9_SCHEDULES = ["STD", "XS"] as const;

export const FITTING_STANDARDS: FittingStandardMeta[] = [
  {
    code: "SABS62",
    name: "SABS 62 (Cast)",
    description: "South African cast steel fittings",
    minNbMm: 15,
    maxNbMm: 300,
    sizes: [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300],
    classes: ["MEDIUM", "HEAVY"],
    schedules: null,
  },
  {
    code: "SABS719",
    name: "SABS 719 (Fabricated)",
    description: "South African fabricated steel fittings",
    minNbMm: 15,
    maxNbMm: 1200,
    sizes: [
      15, 20, 25, 32, 40, 50, 65, 80, 90, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
      750, 900, 1000, 1050, 1200,
    ],
    classes: null,
    schedules: null,
  },
  {
    code: "ASME_B16_9",
    name: "ASME B16.9 (Butt-Weld)",
    description: "Butt-welding wrought steel fittings per ASME B16.9",
    minNbMm: 15,
    maxNbMm: 600,
    sizes: ASME_B16_9_SIZES,
    classes: null,
    schedules: [...ASME_B16_9_SCHEDULES],
  },
  {
    code: "ASME_B16_11",
    name: "ASME B16.11 (Forged)",
    description: "Forged steel socket-weld and threaded fittings per ASME B16.11",
    minNbMm: 6,
    maxNbMm: 100,
    sizes: ASME_B16_11_SIZES,
    classes: [...ASME_B16_11_CLASSES],
    schedules: null,
  },
  {
    code: "BS_143",
    name: "BS 143 (Malleable Iron)",
    description: "Malleable cast iron threaded fittings per BS 143 / EN 10242",
    minNbMm: 6,
    maxNbMm: 100,
    sizes: BS_143_SIZES,
    classes: [...BS_143_CLASSES],
    schedules: null,
  },
];

export const fittingStandardByCode = (code: FittingStandardCode): FittingStandardMeta | null =>
  FITTING_STANDARDS.find((s) => s.code === code) || null;
