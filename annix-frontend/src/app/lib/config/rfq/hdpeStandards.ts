import type { HdpeGradeCode } from "./hdpeGrades";
import { HDPE_GRADES } from "./hdpeGrades";
import type { PnClass, SdrValue } from "./hdpeSdrRatings";
import { calculatePnFromSdr, pnClassForSdr, SDR_RATINGS, SDR_VALUES } from "./hdpeSdrRatings";
import {
  deratedPressure,
  HDPE_MAX_CONTINUOUS_TEMP_C,
  HDPE_MIN_OPERATING_TEMP_C,
} from "./hdpeTemperatureDerating";

export type HdpeStandardCode =
  | "ASTM_D3350"
  | "ASTM_F714"
  | "ASTM_D3035"
  | "AWWA_C906"
  | "AWWA_C901"
  | "ISO_4427"
  | "EN_12201"
  | "ISO_4437"
  | "PPI_TR4";

export type StandardCategory = "material" | "pipe" | "fitting" | "design" | "gas";

export interface HdpeStandard {
  code: HdpeStandardCode;
  name: string;
  fullName: string;
  category: StandardCategory;
  organization: string;
  region: "US" | "EU" | "International";
  description: string;
  applicableSizes: { minDnMm: number; maxDnMm: number | null };
  applicableGrades: HdpeGradeCode[];
  keyRequirements: string[];
  referenceUrl: string | null;
}

export const HDPE_STANDARDS: Record<HdpeStandardCode, HdpeStandard> = {
  ASTM_D3350: {
    code: "ASTM_D3350",
    name: "ASTM D3350",
    fullName: "Standard Specification for Polyethylene Plastics Pipe and Fittings Materials",
    category: "material",
    organization: "ASTM International",
    region: "US",
    description: "Defines cell classification system for PE materials (e.g., PE4710 = 445574C)",
    applicableSizes: { minDnMm: 0, maxDnMm: null },
    applicableGrades: ["PE80", "PE100", "PE4710"],
    keyRequirements: [
      "Cell classification: density, melt index, flexural modulus, tensile strength, SCG resistance, HDB",
      "PE4710: Cell class 445574C with 1600 psi HDB at 73F",
      "PE100: Minimum 10 MPa MRS classification",
      "Material lot traceability required",
    ],
    referenceUrl: "https://www.astm.org/d3350-21.html",
  },
  ASTM_F714: {
    code: "ASTM_F714",
    name: "ASTM F714",
    fullName: "Standard Specification for Polyethylene (PE) Plastic Pipe (DR-PR)",
    category: "pipe",
    organization: "ASTM International",
    region: "US",
    description: "Dimension ratio pressure-rated PE pipe for water, industrial, and other uses",
    applicableSizes: { minDnMm: 75, maxDnMm: 1600 },
    applicableGrades: ["PE80", "PE100", "PE4710"],
    keyRequirements: [
      "DR (Dimension Ratio) based pressure rating",
      "Pressure rating = 2 x HDS / (DR - 1)",
      "Standard lengths: 40ft (12.2m) or 50ft (15.2m)",
      "Marking: size, DR, material, manufacturer, date",
    ],
    referenceUrl: "https://www.astm.org/f0714-22.html",
  },
  ASTM_D3035: {
    code: "ASTM_D3035",
    name: "ASTM D3035",
    fullName: "Standard Specification for Polyethylene (PE) Plastic Pipe (DR-PR) Based on OD",
    category: "pipe",
    organization: "ASTM International",
    region: "US",
    description: "OD-based PE pipe with controlled outside diameter (IPS and DIPS sizes)",
    applicableSizes: { minDnMm: 15, maxDnMm: 1600 },
    applicableGrades: ["PE80", "PE100", "PE4710"],
    keyRequirements: [
      "IPS (Iron Pipe Size) or DIPS (Ductile Iron Pipe Size) OD",
      "DR based wall thickness: wall = OD / DR",
      "Pressure class per HDB and DR",
      "Hydrostatic sustained pressure test required",
    ],
    referenceUrl: "https://www.astm.org/d3035-21.html",
  },
  AWWA_C906: {
    code: "AWWA_C906",
    name: "AWWA C906",
    fullName: "Polyethylene (PE) Pressure Pipe and Fittings, 4 In. Through 65 In., for Water",
    category: "pipe",
    organization: "American Water Works Association",
    region: "US",
    description: "PE pressure pipe for potable water transmission and distribution (>4 inch)",
    applicableSizes: { minDnMm: 100, maxDnMm: 1650 },
    applicableGrades: ["PE100", "PE4710"],
    keyRequirements: [
      "Minimum PE4710 or PE100 material",
      "DR 7, 9, 11, 13.5, 17, 21, 26, or 32.5",
      "Pressure classes: 333, 250, 200, 160, 125, 100, 80, 63 psi",
      "Pipe color: solid black with blue stripes or solid blue",
      "NSF/ANSI 61 certification for potable water",
    ],
    referenceUrl: "https://www.awwa.org/Store/Product-Details/productId/77066",
  },
  AWWA_C901: {
    code: "AWWA_C901",
    name: "AWWA C901",
    fullName: "Polyethylene (PE) Pressure Pipe and Tubing, 3/4 In. Through 3 In., for Water",
    category: "pipe",
    organization: "American Water Works Association",
    region: "US",
    description: "PE pressure pipe for potable water service lines (≤3 inch)",
    applicableSizes: { minDnMm: 19, maxDnMm: 75 },
    applicableGrades: ["PE100", "PE4710"],
    keyRequirements: [
      "Service line and small distribution applications",
      "CTS (Copper Tube Size) or IPS outside diameter",
      "DR 7, 9, 11 for pressure service",
      "Coil or straight length supply",
      "NSF/ANSI 61 certification required",
    ],
    referenceUrl: "https://www.awwa.org/Store/Product-Details/productId/77064",
  },
  ISO_4427: {
    code: "ISO_4427",
    name: "ISO 4427",
    fullName: "Plastics piping systems for water supply - Polyethylene (PE)",
    category: "pipe",
    organization: "International Organization for Standardization",
    region: "International",
    description: "International standard for PE pipes and fittings for water supply",
    applicableSizes: { minDnMm: 16, maxDnMm: 2000 },
    applicableGrades: ["PE80", "PE100"],
    keyRequirements: [
      "MRS (Minimum Required Strength) classification: PE80 (8 MPa), PE100 (10 MPa)",
      "SDR series: 6, 7.4, 9, 11, 13.6, 17, 21, 26, 33, 41",
      "PN = 20 x MRS / (C x (SDR - 1)) where C = 1.25",
      "Standard lengths: 5m, 6m, 12m or coils",
      "Color: blue, black with blue stripes, or as specified",
    ],
    referenceUrl: "https://www.iso.org/standard/72428.html",
  },
  EN_12201: {
    code: "EN_12201",
    name: "EN 12201",
    fullName: "Plastics piping systems for water supply - Polyethylene (PE)",
    category: "pipe",
    organization: "European Committee for Standardization",
    region: "EU",
    description: "European standard for PE pipes and fittings for water supply (based on ISO 4427)",
    applicableSizes: { minDnMm: 16, maxDnMm: 2000 },
    applicableGrades: ["PE80", "PE100"],
    keyRequirements: [
      "Harmonized with ISO 4427",
      "PE80 and PE100 compound grades",
      "SDR classification with PN ratings",
      "CE marking requirements",
      "WRAS or equivalent potable water approval",
    ],
    referenceUrl: "https://www.en-standard.eu/bs-en-12201-1-2011",
  },
  ISO_4437: {
    code: "ISO_4437",
    name: "ISO 4437",
    fullName: "Plastics piping systems for gas supply - Polyethylene (PE)",
    category: "gas",
    organization: "International Organization for Standardization",
    region: "International",
    description: "International standard for PE pipes and fittings for gas distribution",
    applicableSizes: { minDnMm: 16, maxDnMm: 630 },
    applicableGrades: ["PE80", "PE100"],
    keyRequirements: [
      "MOP (Maximum Operating Pressure) classification",
      "SDR 11 for up to 4 bar gas service",
      "SDR 17.6 for up to 2 bar gas service",
      "Yellow color or black with yellow stripes",
      "Enhanced slow crack growth resistance required",
    ],
    referenceUrl: "https://www.iso.org/standard/65252.html",
  },
  PPI_TR4: {
    code: "PPI_TR4",
    name: "PPI TR-4",
    fullName:
      "PPI Listing of Hydrostatic Design Basis, Strength Design Basis, and Minimum Required Strength",
    category: "design",
    organization: "Plastics Pipe Institute",
    region: "US",
    description: "Reference document for HDB, SDB, and MRS values for PE materials",
    applicableSizes: { minDnMm: 0, maxDnMm: null },
    applicableGrades: ["PE32", "PE40", "PE63", "PE80", "PE100", "PE4710"],
    keyRequirements: [
      "HDB (Hydrostatic Design Basis) values at 73F and 140F",
      "PE4710: 1600 psi HDB at 73F, 800 psi at 140F",
      "Stress regression analysis per ASTM D2837",
      "Material compound approval listings",
      "Service factor (DF) recommendations",
    ],
    referenceUrl: "https://plasticpipe.org/publications/tr-4.html",
  },
};

export const HDPE_STANDARD_LIST: HdpeStandardCode[] = [
  "ASTM_D3350",
  "ASTM_F714",
  "ASTM_D3035",
  "AWWA_C906",
  "AWWA_C901",
  "ISO_4427",
  "EN_12201",
  "ISO_4437",
  "PPI_TR4",
];

export const standardsByCategory = (category: StandardCategory): HdpeStandard[] => {
  return HDPE_STANDARD_LIST.map((code) => HDPE_STANDARDS[code]).filter(
    (std) => std.category === category,
  );
};

export const standardsByRegion = (region: "US" | "EU" | "International"): HdpeStandard[] => {
  return HDPE_STANDARD_LIST.map((code) => HDPE_STANDARDS[code]).filter(
    (std) => std.region === region,
  );
};

export const standardsForGrade = (gradeCode: HdpeGradeCode): HdpeStandard[] => {
  return HDPE_STANDARD_LIST.map((code) => HDPE_STANDARDS[code]).filter((std) =>
    std.applicableGrades.includes(gradeCode),
  );
};

export const standardsForSize = (dnMm: number): HdpeStandard[] => {
  return HDPE_STANDARD_LIST.map((code) => HDPE_STANDARDS[code]).filter(
    (std) =>
      dnMm >= std.applicableSizes.minDnMm &&
      (std.applicableSizes.maxDnMm === null || dnMm <= std.applicableSizes.maxDnMm),
  );
};

export interface SdrPressureValidation {
  valid: boolean;
  sdr: SdrValue;
  gradeCode: HdpeGradeCode;
  calculatedPn: number;
  requiredPn: number;
  margin: number;
  marginPct: number;
  recommendation: string | null;
}

export const validateSdrForPressure = (
  sdr: SdrValue,
  gradeCode: HdpeGradeCode,
  requiredPnBar: number,
): SdrPressureValidation => {
  const calculatedPn = calculatePnFromSdr(sdr, gradeCode);
  const margin = calculatedPn - requiredPnBar;
  const marginPct = requiredPnBar > 0 ? (margin / requiredPnBar) * 100 : 0;
  const valid = calculatedPn >= requiredPnBar;

  let recommendation: string | null = null;
  if (!valid) {
    const suitableSdrs = SDR_VALUES.filter(
      (s) => calculatePnFromSdr(s, gradeCode) >= requiredPnBar,
    );
    const recommendedSdr = suitableSdrs.length > 0 ? Math.max(...suitableSdrs) : null;
    recommendation = recommendedSdr
      ? `SDR ${sdr} provides only ${calculatedPn} bar. Use SDR ${recommendedSdr} or lower for ${requiredPnBar} bar requirement.`
      : `No standard SDR for ${gradeCode} meets ${requiredPnBar} bar. Consider higher grade material.`;
  } else if (marginPct > 50) {
    const economicalSdrs = SDR_VALUES.filter(
      (s) => calculatePnFromSdr(s, gradeCode) >= requiredPnBar && s > sdr,
    );
    if (economicalSdrs.length > 0) {
      recommendation = `SDR ${sdr} exceeds requirement by ${Math.round(marginPct)}%. SDR ${Math.min(...economicalSdrs)} may be more economical.`;
    }
  }

  return {
    valid,
    sdr,
    gradeCode,
    calculatedPn,
    requiredPn: requiredPnBar,
    margin: Math.round(margin * 10) / 10,
    marginPct: Math.round(marginPct),
    recommendation,
  };
};

export interface GradeSdrCompatibility {
  compatible: boolean;
  gradeCode: HdpeGradeCode;
  sdr: SdrValue;
  pnClass: PnClass | null;
  warnings: string[];
  applicableStandards: HdpeStandardCode[];
}

export const validateGradeSdrCompatibility = (
  gradeCode: HdpeGradeCode,
  sdr: SdrValue,
): GradeSdrCompatibility => {
  const warnings: string[] = [];
  const grade = HDPE_GRADES[gradeCode];
  const sdrRating = SDR_RATINGS[sdr];
  const pnClass = pnClassForSdr(sdr, gradeCode);

  if (!grade) {
    return {
      compatible: false,
      gradeCode,
      sdr,
      pnClass: null,
      warnings: [`Unknown grade: ${gradeCode}`],
      applicableStandards: [],
    };
  }

  if (!sdrRating) {
    return {
      compatible: false,
      gradeCode,
      sdr,
      pnClass: null,
      warnings: [`Unknown SDR: ${sdr}`],
      applicableStandards: [],
    };
  }

  if (gradeCode === "PE80" && sdrRating.pnPE80 === null) {
    warnings.push(`SDR ${sdr} is not typically used with PE80 grade - pressure rating too low`);
  }

  if ((gradeCode === "PE32" || gradeCode === "PE40") && sdr < 21) {
    warnings.push(
      `${gradeCode} is rarely used with SDR ${sdr} - consider PE80 or PE100 for pressure applications`,
    );
  }

  if (gradeCode === "PE4710" && sdr > 17) {
    warnings.push(`PE4710 with SDR ${sdr} underutilizes material strength - common SDRs are 7-17`);
  }

  const applicableStandards = standardsForGrade(gradeCode)
    .filter((std) => std.applicableGrades.includes(gradeCode))
    .map((std) => std.code);

  return {
    compatible: warnings.length === 0,
    gradeCode,
    sdr,
    pnClass,
    warnings,
    applicableStandards,
  };
};

export interface TemperaturePressureValidation {
  valid: boolean;
  temperatureC: number;
  basePnBar: number;
  deratedPnBar: number;
  requiredPnBar: number;
  deratingFactor: number;
  errors: string[];
  warnings: string[];
}

export const validateTemperatureAndPressure = (
  temperatureC: number,
  basePnBar: number,
  requiredPnBar: number,
): TemperaturePressureValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (temperatureC < HDPE_MIN_OPERATING_TEMP_C) {
    errors.push(
      `Temperature ${temperatureC}°C below minimum ${HDPE_MIN_OPERATING_TEMP_C}°C - HDPE becomes brittle`,
    );
  }

  if (temperatureC > HDPE_MAX_CONTINUOUS_TEMP_C) {
    errors.push(
      `Temperature ${temperatureC}°C exceeds maximum continuous ${HDPE_MAX_CONTINUOUS_TEMP_C}°C`,
    );
  }

  const { deratedPnBar, factor } = deratedPressure(basePnBar, temperatureC);

  if (deratedPnBar < requiredPnBar) {
    errors.push(
      `Derated pressure ${deratedPnBar} bar at ${temperatureC}°C is below required ${requiredPnBar} bar`,
    );
  }

  if (temperatureC > 40 && factor < 0.8) {
    warnings.push(
      `Significant derating (${Math.round(factor * 100)}%) at ${temperatureC}°C - verify application suitability`,
    );
  }

  if (temperatureC > 20 && temperatureC <= 40 && deratedPnBar >= requiredPnBar) {
    const margin = deratedPnBar - requiredPnBar;
    if (margin < 1) {
      warnings.push(
        `Derated pressure ${deratedPnBar} bar is close to required ${requiredPnBar} bar - consider safety margin`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    temperatureC,
    basePnBar,
    deratedPnBar,
    requiredPnBar,
    deratingFactor: factor,
    errors,
    warnings,
  };
};

export interface ComprehensiveValidation {
  overall: boolean;
  sdrValidation: SdrPressureValidation;
  compatibilityValidation: GradeSdrCompatibility;
  temperatureValidation: TemperaturePressureValidation;
  applicableStandards: HdpeStandard[];
  allWarnings: string[];
  allErrors: string[];
}

export const validateHdpeSpecification = (
  gradeCode: HdpeGradeCode,
  sdr: SdrValue,
  requiredPnBar: number,
  operatingTempC: number = 20,
  dnMm?: number,
): ComprehensiveValidation => {
  const basePn = calculatePnFromSdr(sdr, gradeCode);

  const sdrValidation = validateSdrForPressure(sdr, gradeCode, requiredPnBar);
  const compatibilityValidation = validateGradeSdrCompatibility(gradeCode, sdr);
  const temperatureValidation = validateTemperatureAndPressure(
    operatingTempC,
    basePn,
    requiredPnBar,
  );

  let applicableStandards = standardsForGrade(gradeCode);
  if (dnMm !== undefined) {
    const sizeStandards = standardsForSize(dnMm);
    applicableStandards = applicableStandards.filter((std) =>
      sizeStandards.some((ss) => ss.code === std.code),
    );
  }

  const allWarnings = [
    ...compatibilityValidation.warnings,
    ...temperatureValidation.warnings,
    sdrValidation.recommendation,
  ].filter((w): w is string => w !== null);

  const allErrors = [...temperatureValidation.errors];
  if (!sdrValidation.valid) {
    allErrors.push(
      `SDR ${sdr} with ${gradeCode} provides ${sdrValidation.calculatedPn} bar, below required ${requiredPnBar} bar`,
    );
  }

  return {
    overall: sdrValidation.valid && temperatureValidation.valid,
    sdrValidation,
    compatibilityValidation,
    temperatureValidation,
    applicableStandards,
    allWarnings,
    allErrors,
  };
};

export interface StandardRecommendation {
  standard: HdpeStandard;
  relevance: "primary" | "secondary" | "reference";
  reason: string;
}

export const recommendStandards = (
  application: "water" | "gas" | "industrial" | "sewer",
  region: "US" | "EU" | "International",
  dnMm: number,
): StandardRecommendation[] => {
  const recommendations: StandardRecommendation[] = [];

  if (application === "water") {
    if (region === "US") {
      if (dnMm > 75) {
        recommendations.push({
          standard: HDPE_STANDARDS.AWWA_C906,
          relevance: "primary",
          reason: "Primary US standard for potable water pipe >4 inch",
        });
      } else {
        recommendations.push({
          standard: HDPE_STANDARDS.AWWA_C901,
          relevance: "primary",
          reason: "Primary US standard for potable water service lines ≤3 inch",
        });
      }
      recommendations.push({
        standard: HDPE_STANDARDS.ASTM_D3350,
        relevance: "secondary",
        reason: "Material specification referenced by AWWA standards",
      });
    } else {
      recommendations.push({
        standard: HDPE_STANDARDS.ISO_4427,
        relevance: "primary",
        reason: "International standard for PE water piping systems",
      });
      if (region === "EU") {
        recommendations.push({
          standard: HDPE_STANDARDS.EN_12201,
          relevance: "primary",
          reason: "European harmonized standard for PE water pipes",
        });
      }
    }
  }

  if (application === "gas") {
    recommendations.push({
      standard: HDPE_STANDARDS.ISO_4437,
      relevance: "primary",
      reason: "International standard for PE gas distribution piping",
    });
  }

  recommendations.push({
    standard: HDPE_STANDARDS.PPI_TR4,
    relevance: "reference",
    reason: "Reference for material HDB/MRS values and design factors",
  });

  return recommendations;
};
