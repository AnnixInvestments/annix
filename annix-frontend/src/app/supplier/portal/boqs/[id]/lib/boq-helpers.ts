import { keys } from "es-toolkit/compat";
import type { RfqItemDetail, SupplierBoqStatus } from "@/app/lib/api/supplierApi";
import type { FlangeTypeWeightRecord } from "@/app/lib/query/hooks";
import {
  blankFlangeWeight as blankFlangeWeightLookup,
  flangeWeight as flangeWeightLookup,
  sansBlankFlangeWeight as sansBlankFlangeWeightLookup,
} from "@/app/lib/query/hooks";
import type { ExtractedSpecs, WeldTotals } from "./types";

export const normalizeSteelSpec = (spec: string): string => {
  return spec
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/SABS\s*(\d+)/g, "SABS $1")
    .trim();
};

export const isRotatingFlange = (config: string): boolean => {
  return config.includes("RF") || config.includes("R/F");
};

export const isSlipOnFlange = (config: string): boolean => {
  return Boolean(config) && config !== "PE" && !isRotatingFlange(config);
};

export const flangeCountFromConfig = (config: string | undefined, itemType: string): number => {
  if (!config || config === "PE") return 0;
  if (itemType === "bend" || itemType === "straight_pipe") {
    const counts: Record<string, number> = {
      FOE: 1,
      FBE: 2,
      FOE_LF: 2,
      FOE_RF: 2,
      "2X_RF": 2,
      "2xLF": 2,
    };
    const count = counts[config];
    return count ? count : 0;
  }
  if (itemType === "fitting") {
    const counts: Record<string, number> = {
      FAE: 3,
      FFF: 3,
      F2E: 2,
      F2E_RF: 3,
      F2E_LF: 3,
      "3X_RF": 3,
      "2X_RF_FOE": 3,
      FFP: 2,
      PFF: 2,
      PPF: 1,
      FPP: 1,
      PFP: 1,
    };
    const count = counts[config];
    return count ? count : 0;
  }
  return 0;
};

export const recalculateFlangeWeight = (
  allWeights: FlangeTypeWeightRecord[],
  description: string,
  qty: number,
  isBlankFlange: boolean,
): number => {
  const nbMatch = description.match(/(\d+)\s*NB/i);
  const nb = nbMatch ? parseInt(nbMatch[1], 10) : 0;
  if (nb === 0) return 0;

  const pressureClassMatch = description.match(/(\d+\/\d)/);
  const pressureClass = pressureClassMatch ? pressureClassMatch[1] : "PN16";

  const isSans =
    description.toUpperCase().includes("SABS") ||
    description.toUpperCase().includes("SANS") ||
    pressureClassMatch;
  const flangeStandard = isSans ? "SANS 1123" : "";

  if (isBlankFlange || description.toUpperCase().includes("BLANK")) {
    if (isSans) {
      return sansBlankFlangeWeightLookup(allWeights, nb, pressureClass) * qty;
    }
    return blankFlangeWeightLookup(allWeights, nb, pressureClass) * qty;
  }

  return flangeWeightLookup(allWeights, nb, pressureClass, flangeStandard, "3") * qty;
};

export const extractUniqueSpecs = (items: RfqItemDetail[]): ExtractedSpecs => {
  const steelSpecs = new Set<string>();
  const flangeTypes = { slipOn: false, rotating: false, blank: false };

  items.forEach((item) => {
    const straightDetails = item.straightPipeDetails;
    const bendDetails = item.bendDetails;
    const fittingDetails = item.fittingDetails;

    if (straightDetails) {
      if (straightDetails.pipeStandard) {
        steelSpecs.add(normalizeSteelSpec(straightDetails.pipeStandard));
      }
      const config = straightDetails.pipeEndConfiguration;
      if (config && config !== "PE") {
        if (isRotatingFlange(config)) {
          flangeTypes.rotating = true;
        }
        if (isSlipOnFlange(config)) {
          flangeTypes.slipOn = true;
        }
      }
    }

    if (bendDetails) {
      if (bendDetails.pipeStandard) {
        steelSpecs.add(normalizeSteelSpec(bendDetails.pipeStandard));
      }
      const config = bendDetails.bendEndConfiguration;
      if (config && config !== "PE") {
        if (isRotatingFlange(config)) {
          flangeTypes.rotating = true;
        }
        if (isSlipOnFlange(config)) {
          flangeTypes.slipOn = true;
        }
      }
    }

    if (fittingDetails) {
      if (fittingDetails.fittingStandard) {
        steelSpecs.add(normalizeSteelSpec(fittingDetails.fittingStandard));
      }
      const config = fittingDetails.pipeEndConfiguration;
      if (config && config !== "PE") {
        if (isRotatingFlange(config)) {
          flangeTypes.rotating = true;
        }
        if (isSlipOnFlange(config)) {
          flangeTypes.slipOn = true;
        }
      }
      if (fittingDetails.addBlankFlange) {
        flangeTypes.blank = true;
      }
    }

    const description = item.description.toUpperCase();
    const sabsMatch = description.match(/SABS\s*(\d+)/);
    if (sabsMatch) {
      steelSpecs.add(`SABS ${sabsMatch[1]}`);
    }
    if (description.includes("BLANK") && description.includes("FLANGE")) {
      flangeTypes.blank = true;
    }
  });

  return {
    steelSpecs: Array.from(steelSpecs).sort(),
    weldTypes: {
      flangeWeld: false,
      mitreWeld: false,
      teeWeld: false,
      tackWeld: false,
      gussetTeeWeld: false,
      latWeld45Plus: false,
      latWeldUnder45: false,
    },
    flangeTypes,
    bnwGrade: null,
    valveTypes: [],
    instrumentTypes: [],
    pumpTypes: [],
  };
};

export const NOMINAL_TO_OD_MM: Record<number, number> = {
  15: 21.3,
  20: 26.7,
  25: 33.4,
  32: 42.2,
  40: 48.3,
  50: 60.3,
  65: 73.0,
  80: 88.9,
  100: 114.3,
  125: 141.3,
  150: 168.3,
  200: 219.1,
  250: 273.1,
  300: 323.9,
  350: 355.6,
  400: 406.4,
  450: 457.2,
  500: 508.0,
  550: 558.8,
  600: 609.6,
  650: 660.4,
  700: 711.2,
  750: 762.0,
  800: 812.8,
  850: 863.6,
  900: 914.4,
  950: 965.2,
  1000: 1016.0,
  1050: 1066.8,
  1100: 1117.6,
  1200: 1219.2,
  1400: 1422.4,
  1500: 1524.0,
  1600: 1625.6,
  1800: 1828.8,
  2000: 2032.0,
};

export const nominalToOutsideDiameter = (nominalBoreMm: number | undefined): number => {
  if (!nominalBoreMm) return 0;
  const roundedNominal = Math.round(nominalBoreMm);
  if (NOMINAL_TO_OD_MM[roundedNominal]) {
    return NOMINAL_TO_OD_MM[roundedNominal];
  }
  const nominalKeys = keys(NOMINAL_TO_OD_MM)
    .map(Number)
    .sort((a, b) => a - b);
  const closest = nominalKeys.reduce((prev, curr) =>
    Math.abs(curr - roundedNominal) < Math.abs(prev - roundedNominal) ? curr : prev,
  );
  const odAtClosest = NOMINAL_TO_OD_MM[closest];
  return odAtClosest ? odAtClosest : roundedNominal * 1.05;
};

export const calculateWeldCircumference = (diameterMm: number | undefined): number => {
  if (!diameterMm) return 0;
  return (Math.PI * diameterMm) / 1000;
};

export const countFlangesFromConfig = (config: string | undefined, itemType: string): number => {
  if (!config || config === "PE") return 0;
  if (itemType === "straight_pipe") {
    const counts: Record<string, number> = {
      FOE: 1,
      FBE: 2,
      FOE_LF: 2,
      FOE_RF: 2,
      "2X_RF": 2,
      "2xLF": 4,
    };
    const count = counts[config];
    return count ? count : 0;
  }
  if (itemType === "bend") {
    const counts: Record<string, number> = {
      FOE: 1,
      FBE: 2,
      FOE_LF: 2,
      FOE_RF: 2,
      "2X_RF": 2,
      "2xLF": 4,
    };
    const count = counts[config];
    return count ? count : 0;
  }
  if (itemType === "fitting") {
    const counts: Record<string, number> = {
      FAE: 3,
      FFF: 3,
      F2E: 2,
      F2E_RF: 3,
      F2E_LF: 3,
      "3X_RF": 3,
      "2X_RF_FOE": 3,
      FFP: 2,
      PFF: 2,
      PPF: 1,
      FPP: 1,
      PFP: 1,
    };
    const count = counts[config];
    return count ? count : 0;
  }
  return 0;
};

export const hasLooseFlanges = (config: string | undefined): boolean => {
  if (!config) return false;
  return config.includes("LF") || config.includes("_L") || config === "2xLF";
};

export const countLooseFlanges = (config: string | undefined, itemType: string): number => {
  if (!config) return 0;
  if (itemType === "straight_pipe" || itemType === "bend") {
    const counts: Record<string, number> = {
      FOE_LF: 1,
      "2xLF": 2,
      "2X_RF": 0,
    };
    if (counts[config] !== undefined) return counts[config];
    if (config.includes("LF")) return 1;
    if (config.includes("_L")) return 1;
  }
  if (itemType === "fitting") {
    const counts: Record<string, number> = {
      F2E_LF: 1,
      FAE_LF: 1,
    };
    if (counts[config] !== undefined) return counts[config];
    if (config.includes("LF")) return 1;
    if (config.includes("_L")) return 1;
  }
  return 0;
};

export const extractWeldTypesFromRfqItems = (
  items: RfqItemDetail[],
): { weldTypes: ExtractedSpecs["weldTypes"]; totals: WeldTotals } => {
  const weldTypes = {
    flangeWeld: false,
    mitreWeld: false,
    teeWeld: false,
    tackWeld: false,
    gussetTeeWeld: false,
    latWeld45Plus: false,
    latWeldUnder45: false,
  };
  const totals = {
    flangeWeld: 0,
    mitreWeld: 0,
    teeWeld: 0,
    tackWeld: 0,
    gussetTeeWeld: 0,
    latWeld45Plus: 0,
    latWeldUnder45: 0,
  };

  items.forEach((item) => {
    const rawQuantity = item.quantity;
    const qty = rawQuantity || 1;

    if (item.straightPipeDetails) {
      const details = item.straightPipeDetails;
      const outsideDiameter = (() => {
        const rawCalculatedOdMm = details.calculatedOdMm;
        return rawCalculatedOdMm || nominalToOutsideDiameter(details.nominalBoreMm);
      })();
      const circumference = calculateWeldCircumference(outsideDiameter);
      const flangeCount = countFlangesFromConfig(details.pipeEndConfiguration, "straight_pipe");
      const hasLoose = hasLooseFlanges(details.pipeEndConfiguration);

      if (details.totalButtWeldLengthM && details.totalButtWeldLengthM > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += details.totalButtWeldLengthM * qty;
      } else if (details.numberOfButtWelds && details.numberOfButtWelds > 0 && circumference > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += circumference * details.numberOfButtWelds * qty;
      }

      if (details.totalFlangeWeldLengthM && details.totalFlangeWeldLengthM > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += details.totalFlangeWeldLengthM * qty;
      } else if (circumference > 0 && flangeCount > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += circumference * flangeCount * qty;
      }

      if (hasLoose) {
        const looseFlangeCount = countLooseFlanges(details.pipeEndConfiguration, "straight_pipe");
        if (looseFlangeCount > 0) {
          weldTypes.tackWeld = true;
          totals.tackWeld += 0.08 * looseFlangeCount * qty;
        }
      }
    }

    if (item.bendDetails) {
      const details = item.bendDetails;
      const outsideDiameter = nominalToOutsideDiameter(details.nominalBoreMm);
      const circumference = calculateWeldCircumference(outsideDiameter);
      const flangeCount = countFlangesFromConfig(details.bendEndConfiguration, "bend");
      const numberOfTangents = (() => {
        const rawNumberOfTangents = details.numberOfTangents;
        return rawNumberOfTangents || 0;
      })();
      const hasLoose = hasLooseFlanges(details.bendEndConfiguration);

      if (numberOfTangents > 0 && circumference > 0) {
        weldTypes.mitreWeld = true;
        totals.mitreWeld += circumference * (numberOfTangents + 1) * qty;
      }

      if (details.totalButtWeldLengthM && details.totalButtWeldLengthM > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += details.totalButtWeldLengthM * qty;
      } else if (numberOfTangents > 0 && circumference > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += circumference * numberOfTangents * qty;
      }

      if (details.totalFlangeWeldLengthM && details.totalFlangeWeldLengthM > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += details.totalFlangeWeldLengthM * qty;
      } else if (circumference > 0 && flangeCount > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += circumference * flangeCount * qty;
      }

      if (hasLoose) {
        const looseFlangeCount = countLooseFlanges(details.bendEndConfiguration, "bend");
        if (looseFlangeCount > 0) {
          weldTypes.tackWeld = true;
          totals.tackWeld += 0.08 * looseFlangeCount * qty;
        }
      }
    }

    if (item.fittingDetails) {
      const details = item.fittingDetails;
      const mainOd = nominalToOutsideDiameter(details.nominalDiameterMm);
      const branchOd = details.branchNominalDiameterMm
        ? nominalToOutsideDiameter(details.branchNominalDiameterMm)
        : mainOd;
      const mainCircumference = calculateWeldCircumference(mainOd);
      const branchCircumference = calculateWeldCircumference(branchOd);
      const flangeCount = (() => {
        const rawNumberOfFlanges = details.numberOfFlanges;
        return (
          rawNumberOfFlanges || countFlangesFromConfig(details.pipeEndConfiguration, "fitting")
        );
      })();
      const fittingType = (() => {
        const rawFittingType = details.fittingType;
        return rawFittingType || "";
      })().toLowerCase();
      const isTee = fittingType.includes("tee") || fittingType.includes("stub");
      const hasLoose = hasLooseFlanges(details.pipeEndConfiguration);

      if (mainCircumference > 0 && flangeCount > 0) {
        weldTypes.flangeWeld = true;
        totals.flangeWeld += mainCircumference * flangeCount * qty;
      }

      if (details.numberOfTeeWelds && details.numberOfTeeWelds > 0) {
        weldTypes.teeWeld = true;
        totals.teeWeld += branchCircumference * details.numberOfTeeWelds * qty;
      } else if (isTee && branchCircumference > 0) {
        weldTypes.teeWeld = true;
        totals.teeWeld += branchCircumference * qty;
      }

      if (hasLoose) {
        const looseFlangeCount = countLooseFlanges(details.pipeEndConfiguration, "fitting");
        if (looseFlangeCount > 0) {
          weldTypes.tackWeld = true;
          totals.tackWeld += 0.08 * looseFlangeCount * qty;
        }
      }
    }
  });

  return { weldTypes, totals };
};

export const statusColors: Record<SupplierBoqStatus, { bg: string; text: string; label: string }> =
  {
    pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
    viewed: { bg: "bg-blue-100", text: "text-blue-800", label: "Viewed" },
    quoted: { bg: "bg-green-100", text: "text-green-800", label: "Quoted" },
    declined: { bg: "bg-red-100", text: "text-red-800", label: "Declined" },
    expired: { bg: "bg-gray-100", text: "text-gray-800", label: "Expired" },
  };

export const formatCurrencyZA = (value: number): string => {
  return value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
