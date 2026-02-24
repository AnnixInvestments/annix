export interface Psl2ComplianceData {
  pslLevel?: string | null;
  cvnTestTemperatureC?: number | null;
  cvnAverageJoules?: number | null;
  cvnMinimumJoules?: number | null;
  ndtCoveragePct?: number | null;
}

export interface Psl2ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validatePSL2Compliance = (data: Psl2ComplianceData): Psl2ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data.pslLevel !== "PSL2") {
    return { isValid: true, errors: [], warnings: [] };
  }

  if (data.cvnTestTemperatureC === null || data.cvnTestTemperatureC === undefined) {
    errors.push("PSL2 requires CVN test temperature to be specified");
  }

  if (data.cvnAverageJoules === null || data.cvnAverageJoules === undefined) {
    errors.push("PSL2 requires CVN average impact energy (Joules) to be specified");
  } else if (data.cvnAverageJoules < 27) {
    warnings.push(
      `CVN average ${data.cvnAverageJoules}J is below typical PSL2 minimum of 27J for full-size specimens`,
    );
  }

  if (data.cvnMinimumJoules === null || data.cvnMinimumJoules === undefined) {
    errors.push("PSL2 requires CVN minimum impact energy (Joules) to be specified");
  } else if (data.cvnMinimumJoules < 20) {
    warnings.push(
      `CVN minimum ${data.cvnMinimumJoules}J is below typical PSL2 minimum of 20J for full-size specimens`,
    );
  }

  if (
    data.cvnAverageJoules !== null &&
    data.cvnAverageJoules !== undefined &&
    data.cvnMinimumJoules !== null &&
    data.cvnMinimumJoules !== undefined
  ) {
    if (data.cvnMinimumJoules > data.cvnAverageJoules) {
      errors.push("CVN minimum cannot exceed CVN average");
    }
  }

  if (data.ndtCoveragePct !== null && data.ndtCoveragePct !== undefined) {
    if (data.ndtCoveragePct < 100) {
      warnings.push(
        `PSL2 typically requires 100% NDT coverage, but ${data.ndtCoveragePct}% specified`,
      );
    }
  } else {
    warnings.push("PSL2 requires 100% NDT coverage - consider specifying ndtCoveragePct");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export interface NaceComplianceData {
  naceCompliant?: boolean | null;
  h2sZone?: number | null;
  maxHardnessHrc?: number | null;
  sscTested?: boolean | null;
  carbonEquivalent?: number | null;
}

export interface NaceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  zone?: string;
}

export const NACE_HARDNESS_LIMITS: Record<string, number> = {
  carbonSteel: 22,
  lowAlloySteel: 22,
  stainlessSteel: 22,
  duplex: 28,
  nickelAlloy: 35,
};

export const H2S_ZONE_DESCRIPTIONS: Record<number, string> = {
  1: "Zone 1: Severe - >0.05 bar H2S partial pressure or >15% H2S",
  2: "Zone 2: Moderate - 0.0003-0.05 bar H2S partial pressure",
  3: "Zone 3: Mild - <0.0003 bar H2S partial pressure",
};

export const validateNACECompliance = (data: NaceComplianceData): NaceValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data.naceCompliant !== true) {
    return { isValid: true, errors: [], warnings: [] };
  }

  if (data.h2sZone === null || data.h2sZone === undefined) {
    warnings.push(
      "NACE compliance specified but H2S zone not defined - consider specifying zone 1, 2, or 3",
    );
  } else if (data.h2sZone < 1 || data.h2sZone > 3) {
    errors.push("H2S zone must be 1, 2, or 3 per NACE MR0175/ISO 15156");
  }

  if (data.maxHardnessHrc === null || data.maxHardnessHrc === undefined) {
    errors.push("NACE compliance requires maximum hardness (HRC) to be specified");
  } else if (data.maxHardnessHrc > 22) {
    errors.push(
      `Maximum hardness ${data.maxHardnessHrc} HRC exceeds NACE limit of 22 HRC for carbon and low-alloy steels`,
    );
  } else if (data.maxHardnessHrc > 20) {
    warnings.push(
      `Maximum hardness ${data.maxHardnessHrc} HRC is close to NACE limit of 22 HRC - ensure proper testing`,
    );
  }

  if (data.h2sZone === 1 && data.sscTested !== true) {
    warnings.push("Zone 1 (severe) sour service typically requires SSC testing per NACE TM0177");
  }

  if (data.carbonEquivalent !== null && data.carbonEquivalent !== undefined) {
    if (data.carbonEquivalent > 0.43) {
      warnings.push(
        `Carbon equivalent ${data.carbonEquivalent} exceeds 0.43 - may require special welding procedures for sour service`,
      );
    }
  }

  const zone = data.h2sZone ? H2S_ZONE_DESCRIPTIONS[data.h2sZone] : undefined;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    zone,
  };
};

export interface ComplianceCheckResult {
  psl2: Psl2ValidationResult;
  nace: NaceValidationResult;
  overallValid: boolean;
  allErrors: string[];
  allWarnings: string[];
}

export const validateAllCompliance = (
  data: Psl2ComplianceData & NaceComplianceData,
): ComplianceCheckResult => {
  const psl2 = validatePSL2Compliance(data);
  const nace = validateNACECompliance(data);

  return {
    psl2,
    nace,
    overallValid: psl2.isValid && nace.isValid,
    allErrors: [...psl2.errors, ...nace.errors],
    allWarnings: [...psl2.warnings, ...nace.warnings],
  };
};
