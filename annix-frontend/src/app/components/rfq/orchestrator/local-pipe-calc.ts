import {
  flangesPerPipe as getFlangesPerPipe,
  flangeWeldCountPerPipe as getFlangeWeldCountPerPipe,
  physicalFlangeCount as getPhysicalFlangeCount,
} from "@/app/lib/config/rfq";
import {
  type FlangeTypeWeightRecord,
  flangeWeight as flangeWeightLookup,
} from "@/app/lib/query/hooks";

export const normalizeFittingTypeForApi = (type?: string | null) => {
  if (!type) return type;
  const map: Record<string, string> = {
    SHORT_REDUCING_TEE: "UNEQUAL_SHORT_TEE",
    GUSSET_REDUCING_TEE: "UNEQUAL_GUSSET_TEE",
  };
  const rawType = map[type];
  return rawType || type;
};

/**
 * Combine pressure class designation with selected flange type for SABS 1123 / BS 4504
 * For example: "1000/3" with flangeTypeCode "/1" becomes "1000/1"
 * Or: "1000" with flangeTypeCode "/3" becomes "1000/3"
 * This is needed because the flange type dropdown is now separate from the pressure class dropdown
 */
export const getPressureClassWithFlangeType = (
  pressureClassDesignation: string,
  flangeTypeCode?: string,
  flangeStandard?: string,
): string => {
  // Only modify for SABS 1123 and BS 4504 standards
  const isSabsOrBs4504 =
    flangeStandard?.includes("SABS 1123") || flangeStandard?.includes("BS 4504");
  if (!isSabsOrBs4504) return pressureClassDesignation;

  // If no flange type code is selected, return the designation as-is
  if (!flangeTypeCode) return pressureClassDesignation;

  // Check if the designation has a /X suffix (e.g., "1000/3" or "10/3")
  const matchWithSuffix = pressureClassDesignation.match(/^(\d+)\/\d+$/);
  if (matchWithSuffix) {
    // Replace the suffix with the selected flange type (e.g., "1000" + "/1" = "1000/1")
    return `${matchWithSuffix[1]}${flangeTypeCode}`;
  }

  // Check if the designation is just a number (e.g., "1000" or "16")
  // This happens when the pressure class dropdown was split and no longer includes the /X suffix
  const matchNumeric = pressureClassDesignation.match(/^(\d+)$/);
  if (matchNumeric) {
    // Append the flange type code (e.g., "1000" + "/3" = "1000/3")
    return `${matchNumeric[1]}${flangeTypeCode}`;
  }

  return pressureClassDesignation;
};

/**
 * Local calculation for pipe weight when API is unavailable
 * Uses formula: ((OD - WT) * WT) * 0.02466 = Kg/m
 *
 * @param nominalBoreMm - Nominal bore in mm
 * @param wallThicknessMm - Wall thickness in mm
 * @param individualPipeLength - Length of each pipe in meters
 * @param quantityValue - Quantity value (pipes or total length)
 * @param quantityType - 'number_of_pipes' or 'total_length'
 * @param pipeEndConfiguration - Pipe end configuration (PE, FOE, FBE, etc.)
 * @param pressureClassDesignation - Optional pressure class for accurate flange weights
 * @param flangeStandard - Optional flange standard (e.g., 'BS 4504', 'SABS 1123')
 * @param flangeTypeCode - Optional flange type code (e.g., '/3', '/5') for SABS 1123 / BS 4504
 */
export const calculateLocalPipeResult = (
  odMap: Record<number, number>,
  weights: FlangeTypeWeightRecord[],
  nominalBoreMm: number,
  wallThicknessMm: number,
  individualPipeLength: number,
  quantityValue: number,
  quantityType: string,
  pipeEndConfiguration: string,
  pressureClassDesignation?: string,
  flangeStandard?: string,
  flangeTypeCode?: string,
): any => {
  const rawNominalBoreMm = odMap[nominalBoreMm];
  const outsideDiameterMm = rawNominalBoreMm || nominalBoreMm * 1.05;

  // Weight per meter formula: ((OD - WT) * WT) * 0.02466
  const pipeWeightPerMeter = (outsideDiameterMm - wallThicknessMm) * wallThicknessMm * 0.02466;

  // Calculate pipe count and total length
  let calculatedPipeCount: number;
  let calculatedTotalLength: number;

  if (quantityType === "total_length") {
    calculatedTotalLength = quantityValue;
    calculatedPipeCount = Math.ceil(quantityValue / individualPipeLength);
  } else {
    // number_of_pipes
    calculatedPipeCount = quantityValue;
    calculatedTotalLength = quantityValue * individualPipeLength;
  }

  // Calculate total pipe weight
  const totalPipeWeight = pipeWeightPerMeter * calculatedTotalLength;

  // Calculate flanges and welds
  // Physical flange count is used for weight calculations and display
  const physicalFlangesPerPipe = getPhysicalFlangeCount(pipeEndConfiguration);
  const numberOfFlanges = physicalFlangesPerPipe * calculatedPipeCount;
  // Bolt connection count is used for BNW calculations
  const flangeConnectionsPerPipe = getFlangesPerPipe(pipeEndConfiguration);
  const numberOfFlangeConnections = flangeConnectionsPerPipe * calculatedPipeCount;

  const flangeWeldsPerPipe = getFlangeWeldCountPerPipe(pipeEndConfiguration);
  const numberOfFlangeWelds = flangeWeldsPerPipe * calculatedPipeCount;

  // Weld length calculations (circumference-based)
  // Each flange requires 2 full welds: 1 inside and 1 outside
  // in meters
  const circumference = (Math.PI * outsideDiameterMm) / 1000;
  // x2 for inside + outside welds per flange
  const totalFlangeWeldLength = numberOfFlangeWelds * circumference * 2;

  const flangeWeightPerUnit = flangeWeightLookup(
    weights,
    nominalBoreMm,
    pressureClassDesignation || "PN16",
    flangeStandard || null,
    flangeTypeCode || "",
  );
  const totalFlangeWeight = numberOfFlanges * flangeWeightPerUnit;

  // Total system weight
  const totalSystemWeight = totalPipeWeight + totalFlangeWeight;

  return {
    pipeWeightPerMeter,
    totalPipeWeight,
    calculatedPipeCount,
    calculatedTotalLength,
    numberOfFlanges,
    // Bolt set connections for BNW calculations
    numberOfFlangeConnections,
    numberOfFlangeWelds,
    totalFlangeWeldLength,
    outsideDiameterMm,
    wallThicknessMm,
    totalFlangeWeight,
    // Include per-unit weight for transparency
    flangeWeightPerUnit,
    // Track which pressure class was used
    pressureClassUsed: pressureClassDesignation || "PN16",
    totalBoltWeight: 0,
    totalNutWeight: 0,
    totalSystemWeight,
    // Flag to indicate this was calculated locally
    isLocalCalculation: true,
  };
};
