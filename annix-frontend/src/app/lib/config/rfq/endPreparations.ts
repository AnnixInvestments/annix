export type EndPrepType = "SQUARE" | "V_BEVEL" | "COMPOUND" | "J_PREP" | "U_PREP";

export interface EndPreparationSpec {
  type: EndPrepType;
  name: string;
  description: string;
  bevelAngleDeg: number;
  bevelAngleTolDeg: number;
  secondaryAngleDeg: number | null;
  rootFaceMm: number;
  rootFaceTolMm: number;
  rootGapMmMin: number;
  rootGapMmMax: number;
  landMm: number | null;
  minWallMm: number;
  maxWallMm: number | null;
  applicableFor: string;
}

export const END_PREPARATIONS: EndPreparationSpec[] = [
  {
    type: "SQUARE",
    name: "Square Cut",
    description: "Plain square cut end, no bevel",
    bevelAngleDeg: 0,
    bevelAngleTolDeg: 0,
    secondaryAngleDeg: null,
    rootFaceMm: 0,
    rootFaceTolMm: 0,
    rootGapMmMin: 1.6,
    rootGapMmMax: 2.4,
    landMm: null,
    minWallMm: 0,
    maxWallMm: 3.0,
    applicableFor: "Thin wall pipe (≤3mm), socket weld connections",
  },
  {
    type: "V_BEVEL",
    name: "Single V-Bevel",
    description: "Standard 37.5° bevel for butt welds",
    bevelAngleDeg: 37.5,
    bevelAngleTolDeg: 2.5,
    secondaryAngleDeg: null,
    rootFaceMm: 1.6,
    rootFaceTolMm: 0.8,
    rootGapMmMin: 1.6,
    rootGapMmMax: 3.2,
    landMm: null,
    minWallMm: 3.0,
    maxWallMm: 22.0,
    applicableFor: "Standard butt welds, most common preparation",
  },
  {
    type: "COMPOUND",
    name: "Compound Bevel",
    description: "10° + 37.5° dual angle for thick wall",
    bevelAngleDeg: 37.5,
    bevelAngleTolDeg: 2.5,
    secondaryAngleDeg: 10,
    rootFaceMm: 1.6,
    rootFaceTolMm: 0.8,
    rootGapMmMin: 3.2,
    rootGapMmMax: 4.0,
    landMm: null,
    minWallMm: 22.0,
    maxWallMm: null,
    applicableFor: "Thick wall pipe (>22mm), reduces weld volume",
  },
  {
    type: "J_PREP",
    name: "J-Preparation",
    description: "J-groove with land for critical welds",
    bevelAngleDeg: 37.5,
    bevelAngleTolDeg: 2.5,
    secondaryAngleDeg: 10,
    rootFaceMm: 3.2,
    rootFaceTolMm: 0.8,
    rootGapMmMin: 2.4,
    rootGapMmMax: 3.2,
    landMm: 6.0,
    minWallMm: 19.0,
    maxWallMm: null,
    applicableFor: "Critical welds, P91/P22, controlled root access",
  },
  {
    type: "U_PREP",
    name: "U-Preparation",
    description: "U-groove for very thick wall pipe",
    bevelAngleDeg: 20,
    bevelAngleTolDeg: 2.5,
    secondaryAngleDeg: null,
    rootFaceMm: 3.2,
    rootFaceTolMm: 0.8,
    rootGapMmMin: 3.2,
    rootGapMmMax: 4.8,
    landMm: 8.0,
    minWallMm: 38.0,
    maxWallMm: null,
    applicableFor: "Very thick wall (>38mm), minimizes weld volume",
  },
];

export const endPreparationByType = (type: EndPrepType): EndPreparationSpec | null => {
  return END_PREPARATIONS.find((p) => p.type === type) ?? null;
};

export const recommendedEndPrep = (wallThicknessMm: number): EndPrepType => {
  if (wallThicknessMm <= 3.0) {
    return "SQUARE";
  }
  if (wallThicknessMm <= 22.0) {
    return "V_BEVEL";
  }
  if (wallThicknessMm <= 38.0) {
    return "COMPOUND";
  }
  return "U_PREP";
};

export const endPrepOptions = (): Array<{ value: EndPrepType; label: string }> => {
  return END_PREPARATIONS.map((p) => ({
    value: p.type,
    label: p.name,
  }));
};
