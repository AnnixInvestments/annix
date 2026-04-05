export type PslLevel = "PSL1" | "PSL2";

export interface Api5lGradeSpec {
  grade: string;
  smysMpa: number;
  smtsMpa: number;
  elongationPctMin: number;
  carbonMaxPct: { psl1: number; psl2: number };
  manganeseMaxPct: number;
  phosphorusMaxPct: { psl1: number; psl2: number };
  sulfurMaxPct: { psl1: number; psl2: number };
  ceqMax: number | null;
  cvnTempC: number | null;
  cvnAvgJ: number | null;
  cvnMinJ: number | null;
}

export const API_5L_GRADES: Record<string, Api5lGradeSpec> = {
  B: {
    grade: "B",
    smysMpa: 245,
    smtsMpa: 415,
    elongationPctMin: 21,
    carbonMaxPct: { psl1: 0.28, psl2: 0.18 },
    manganeseMaxPct: 1.2,
    phosphorusMaxPct: { psl1: 0.03, psl2: 0.015 },
    sulfurMaxPct: { psl1: 0.03, psl2: 0.015 },
    ceqMax: 0.43,
    cvnTempC: 0,
    cvnAvgJ: 27,
    cvnMinJ: 20,
  },
  X42: {
    grade: "X42",
    smysMpa: 290,
    smtsMpa: 415,
    elongationPctMin: 21,
    carbonMaxPct: { psl1: 0.28, psl2: 0.18 },
    manganeseMaxPct: 1.3,
    phosphorusMaxPct: { psl1: 0.03, psl2: 0.015 },
    sulfurMaxPct: { psl1: 0.03, psl2: 0.015 },
    ceqMax: 0.43,
    cvnTempC: 0,
    cvnAvgJ: 27,
    cvnMinJ: 20,
  },
  X46: {
    grade: "X46",
    smysMpa: 320,
    smtsMpa: 435,
    elongationPctMin: 21,
    carbonMaxPct: { psl1: 0.28, psl2: 0.18 },
    manganeseMaxPct: 1.4,
    phosphorusMaxPct: { psl1: 0.03, psl2: 0.015 },
    sulfurMaxPct: { psl1: 0.03, psl2: 0.015 },
    ceqMax: 0.43,
    cvnTempC: 0,
    cvnAvgJ: 27,
    cvnMinJ: 20,
  },
  X52: {
    grade: "X52",
    smysMpa: 360,
    smtsMpa: 460,
    elongationPctMin: 21,
    carbonMaxPct: { psl1: 0.28, psl2: 0.18 },
    manganeseMaxPct: 1.4,
    phosphorusMaxPct: { psl1: 0.03, psl2: 0.015 },
    sulfurMaxPct: { psl1: 0.03, psl2: 0.015 },
    ceqMax: 0.43,
    cvnTempC: 0,
    cvnAvgJ: 27,
    cvnMinJ: 20,
  },
  X56: {
    grade: "X56",
    smysMpa: 390,
    smtsMpa: 490,
    elongationPctMin: 19,
    carbonMaxPct: { psl1: 0.28, psl2: 0.22 },
    manganeseMaxPct: 1.4,
    phosphorusMaxPct: { psl1: 0.03, psl2: 0.015 },
    sulfurMaxPct: { psl1: 0.03, psl2: 0.015 },
    ceqMax: 0.43,
    cvnTempC: 0,
    cvnAvgJ: 27,
    cvnMinJ: 20,
  },
  X60: {
    grade: "X60",
    smysMpa: 415,
    smtsMpa: 520,
    elongationPctMin: 19,
    carbonMaxPct: { psl1: 0.28, psl2: 0.22 },
    manganeseMaxPct: 1.4,
    phosphorusMaxPct: { psl1: 0.03, psl2: 0.015 },
    sulfurMaxPct: { psl1: 0.03, psl2: 0.015 },
    ceqMax: 0.43,
    cvnTempC: 0,
    cvnAvgJ: 27,
    cvnMinJ: 20,
  },
  X65: {
    grade: "X65",
    smysMpa: 450,
    smtsMpa: 535,
    elongationPctMin: 18,
    carbonMaxPct: { psl1: 0.28, psl2: 0.22 },
    manganeseMaxPct: 1.45,
    phosphorusMaxPct: { psl1: 0.03, psl2: 0.015 },
    sulfurMaxPct: { psl1: 0.03, psl2: 0.015 },
    ceqMax: 0.43,
    cvnTempC: 0,
    cvnAvgJ: 27,
    cvnMinJ: 20,
  },
  X70: {
    grade: "X70",
    smysMpa: 485,
    smtsMpa: 570,
    elongationPctMin: 17,
    carbonMaxPct: { psl1: 0.28, psl2: 0.22 },
    manganeseMaxPct: 1.65,
    phosphorusMaxPct: { psl1: 0.03, psl2: 0.015 },
    sulfurMaxPct: { psl1: 0.03, psl2: 0.015 },
    ceqMax: 0.43,
    cvnTempC: 0,
    cvnAvgJ: 40,
    cvnMinJ: 30,
  },
  X80: {
    grade: "X80",
    smysMpa: 555,
    smtsMpa: 625,
    elongationPctMin: 16,
    carbonMaxPct: { psl1: 0.28, psl2: 0.22 },
    manganeseMaxPct: 1.85,
    phosphorusMaxPct: { psl1: 0.03, psl2: 0.015 },
    sulfurMaxPct: { psl1: 0.03, psl2: 0.015 },
    ceqMax: 0.43,
    cvnTempC: -10,
    cvnAvgJ: 40,
    cvnMinJ: 30,
  },
};

export const API_5L_GRADE_LIST = Object.keys(API_5L_GRADES);

export interface ChemistryData {
  c: number;
  mn: number;
  p: number;
  s: number;
  si?: number;
  cr?: number;
  mo?: number;
  v?: number;
  ni?: number;
  cu?: number;
  nb?: number;
  ti?: number;
}

export interface CarbonEquivalentResult {
  ceqIIW: number;
  ceqPcm: number;
  weldable: boolean;
  preheatRequired: boolean;
  preheatTempC: number | null;
  notes: string | null;
}

export const calculateCarbonEquivalent = (chem: ChemistryData): CarbonEquivalentResult => {
  const cr = chem.cr ?? 0;
  const mo = chem.mo ?? 0;
  const v = chem.v ?? 0;
  const ni = chem.ni ?? 0;
  const cu = chem.cu ?? 0;
  const si = chem.si ?? 0;
  const nb = chem.nb ?? 0;
  const ti = chem.ti ?? 0;

  const ceqIIW = chem.c + chem.mn / 6 + (cr + mo + v) / 5 + (ni + cu) / 15;

  const ceqPcm =
    chem.c + si / 30 + (chem.mn + cu + cr) / 20 + ni / 60 + mo / 15 + v / 10 + 5 * (nb + ti);

  const roundedCeqIIW = Math.round(ceqIIW * 1000) / 1000;
  const roundedCeqPcm = Math.round(ceqPcm * 1000) / 1000;

  const weldable = roundedCeqIIW <= 0.43;
  const preheatRequired = roundedCeqIIW > 0.4;

  let preheatTempC: number | null = null;
  let notes: string | null = null;

  if (roundedCeqIIW > 0.45) {
    preheatTempC = 150;
    notes = "High carbon equivalent - preheat 150°C min required, consider low hydrogen electrodes";
  } else if (roundedCeqIIW > 0.43) {
    preheatTempC = 100;
    notes = "Elevated carbon equivalent - preheat 100°C min recommended";
  } else if (roundedCeqIIW > 0.4) {
    preheatTempC = 50;
    notes = "Borderline weldability - preheat 50°C recommended for thick sections";
  }

  return {
    ceqIIW: roundedCeqIIW,
    ceqPcm: roundedCeqPcm,
    weldable,
    preheatRequired,
    preheatTempC,
    notes,
  };
};

export interface MechanicalTestData {
  yieldStrengthMpa: number;
  tensileStrengthMpa: number;
  elongationPct: number;
  cvnTempC?: number;
  cvnAvgJ?: number;
  cvnMinJ?: number;
}

export interface GradeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateApi5lGrade = (
  grade: string,
  pslLevel: PslLevel,
  mechanical: MechanicalTestData,
  chemistry?: ChemistryData,
): GradeValidationResult => {
  const spec = API_5L_GRADES[grade];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!spec) {
    return { valid: false, errors: [`Unknown API 5L grade: ${grade}`], warnings: [] };
  }

  if (mechanical.yieldStrengthMpa < spec.smysMpa) {
    errors.push(
      `Yield strength ${mechanical.yieldStrengthMpa} MPa is below SMYS ${spec.smysMpa} MPa for grade ${grade}`,
    );
  }

  if (mechanical.tensileStrengthMpa < spec.smtsMpa) {
    errors.push(
      `Tensile strength ${mechanical.tensileStrengthMpa} MPa is below SMTS ${spec.smtsMpa} MPa for grade ${grade}`,
    );
  }

  if (mechanical.elongationPct < spec.elongationPctMin) {
    errors.push(
      `Elongation ${mechanical.elongationPct}% is below minimum ${spec.elongationPctMin}% for grade ${grade}`,
    );
  }

  if (pslLevel === "PSL2") {
    if (spec.cvnAvgJ !== null && spec.cvnMinJ !== null) {
      if (mechanical.cvnAvgJ === undefined || mechanical.cvnMinJ === undefined) {
        errors.push("PSL2 requires CVN impact test data");
      } else {
        if (mechanical.cvnAvgJ < spec.cvnAvgJ) {
          errors.push(
            `CVN average ${mechanical.cvnAvgJ}J is below required ${spec.cvnAvgJ}J for PSL2 ${grade}`,
          );
        }
        if (mechanical.cvnMinJ < spec.cvnMinJ) {
          errors.push(
            `CVN minimum ${mechanical.cvnMinJ}J is below required ${spec.cvnMinJ}J for PSL2 ${grade}`,
          );
        }
      }
    }
  }

  if (chemistry) {
    const carbonLimit = pslLevel === "PSL1" ? spec.carbonMaxPct.psl1 : spec.carbonMaxPct.psl2;
    const pLimit = pslLevel === "PSL1" ? spec.phosphorusMaxPct.psl1 : spec.phosphorusMaxPct.psl2;
    const sLimit = pslLevel === "PSL1" ? spec.sulfurMaxPct.psl1 : spec.sulfurMaxPct.psl2;

    if (chemistry.c > carbonLimit) {
      errors.push(`Carbon ${chemistry.c}% exceeds ${pslLevel} limit of ${carbonLimit}%`);
    }
    if (chemistry.mn > spec.manganeseMaxPct) {
      errors.push(`Manganese ${chemistry.mn}% exceeds limit of ${spec.manganeseMaxPct}%`);
    }
    if (chemistry.p > pLimit) {
      errors.push(`Phosphorus ${chemistry.p}% exceeds ${pslLevel} limit of ${pLimit}%`);
    }
    if (chemistry.s > sLimit) {
      errors.push(`Sulfur ${chemistry.s}% exceeds ${pslLevel} limit of ${sLimit}%`);
    }

    const ceqResult = calculateCarbonEquivalent(chemistry);
    if (spec.ceqMax !== null && ceqResult.ceqIIW > spec.ceqMax) {
      warnings.push(
        `Carbon equivalent ${ceqResult.ceqIIW} exceeds recommended maximum ${spec.ceqMax}`,
      );
    }
    if (ceqResult.preheatRequired) {
      warnings.push(ceqResult.notes ?? "Preheat may be required for welding");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

export const ndtCoverageByPsl = (pslLevel: PslLevel): number => {
  return pslLevel === "PSL2" ? 100 : 10;
};

export const heatTraceabilityRequired = (pslLevel: PslLevel): boolean => {
  return pslLevel === "PSL2";
};
