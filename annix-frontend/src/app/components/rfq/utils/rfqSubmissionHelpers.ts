import { FLANGE_OD } from "@annix/product-data/pipe";
import { isNumber, isString } from "es-toolkit/compat";
import type { BnwSetWeightRecord, GasketWeightRecord } from "@/app/lib/api/client";
import { log } from "@/app/lib/logger";
import { buildFlangeLookups, type FlangeTypeWeightRecord } from "@/app/lib/query/hooks";
import { consolidateBoqData } from "@/app/lib/utils/boqConsolidation";

interface GlobalSpecsOverrides {
  workingPressureBar: number | null;
  workingTemperatureC: number | null;
  steelSpecificationId: number | null;
  flangeStandardId: number | null;
  flangePressureClassId: number | null;
}

export function resolveGlobalSpecsOverrides(globalSpecs: any): GlobalSpecsOverrides {
  if (!globalSpecs) {
    return {
      workingPressureBar: null,
      workingTemperatureC: null,
      steelSpecificationId: null,
      flangeStandardId: null,
      flangePressureClassId: null,
    };
  }
  const wpb = globalSpecs.workingPressureBar;
  const wtc = globalSpecs.workingTemperatureC;
  const ssid = globalSpecs.steelSpecificationId;
  const fsid = globalSpecs.flangeStandardId;
  const fpcid = globalSpecs.flangePressureClassId;
  return {
    workingPressureBar: wpb || null,
    workingTemperatureC: wtc || null,
    steelSpecificationId: ssid || null,
    flangeStandardId: fsid || null,
    flangePressureClassId: fpcid || null,
  };
}

export function validateItemsForSubmission(
  allItems: any[],
  action: "submitting" | "re-submitting",
): string | null {
  if (allItems.length === 0) {
    return `Please add at least one item before ${action}.`;
  }

  // Previously this required every straight_pipe / bend / fitting to have a
  // computed `calculation` before submit. That worked for hand-built RFQs but
  // blocked Nix-extracted RFQs silently: HDPE pipes/bends/fittings have no
  // auto-calc path at all, and even steel bends/fittings only get a
  // `calculation` when opened in their per-item form and Calculated. At 500+
  // items that's impractical. Submit now goes through with whatever
  // calculations are present; uncalc items show 0 kg in the BOQ and can be
  // refined on the detail page or by the supplier in quoting.
  return null;
}

export function countUncalculatedItems(allItems: any[]): number {
  const requiresCalc = ["straight_pipe", "bend", "fitting"];
  return allItems.filter((e: any) => requiresCalc.includes(e.itemType) && !e.calculation).length;
}

function mapBendItem(
  entry: any,
  specs: any,
  calculation: any,
  g: GlobalSpecsOverrides,
  globalSpecs: any,
) {
  const gWpb = g.workingPressureBar;
  const gWtc = g.workingTemperatureC;
  const gSsid = g.steelSpecificationId;
  const gFsid = g.flangeStandardId;
  const gFpcid = g.flangePressureClassId;
  const rawStubs = specs.stubs;
  const stubLengths = (rawStubs || [])
    .map((stub: any) => {
      const rawLength = stub?.length;
      return rawLength || 0;
    })
    .filter((l: number) => l > 0);
  const rawDescription = entry.description;
  const rawTotalWeight = calculation.totalWeight;
  const rawNumberOfTangents = specs.numberOfTangents;
  const rawTangentLengths = specs.tangentLengths;
  const rawQuantityType = specs.quantityType;
  const rawQuantityValue = specs.quantityValue;
  const rawWorkingPressureBar = specs.workingPressureBar;
  const rawWorkingTemperatureC = specs.workingTemperatureC;
  const rawSteelSpecificationId = specs.steelSpecificationId;
  const rawUseGlobalFlangeSpecs = specs.useGlobalFlangeSpecs;
  const rawFlangeStandardId = specs.flangeStandardId;
  const rawFlangePressureClassId = specs.flangePressureClassId;
  const rawBendScheduleNumber = specs.scheduleNumber;
  // Same HDPE-resolution logic as mapStraightPipeItem: per-entry
  // spec fields take precedence, then description parsing
  // ("HDPE PE100 PN34 (SDR6)"), then globalSpecs as last resort.
  // Without this the backend's bend calc falls back to steel
  // density and over-estimates HDPE bend mass by ~8x.
  const isHdpe = entry.materialType === "hdpe";
  const parsedHdpe = isHdpe ? parseHdpeFromDescription(rawDescription) : {};
  const rawSpecsBendHdpePeGrade = specs.hdpePeGrade;
  const rawSpecsBendHdpeSdr = specs.hdpeSdr;
  const rawSpecsBendHdpePnRating = specs.hdpePnRating;
  const rawGlobalHdpeGrade = globalSpecs?.hdpeGrade;
  const rawGlobalHdpeSdr = globalSpecs?.hdpeSdr;
  const rawGlobalHdpePressureRating = globalSpecs?.hdpePressureRating;
  const parsedBendPeGrade = parsedHdpe.peGrade;
  const parsedBendSdr = parsedHdpe.sdr;
  const parsedBendPn = parsedHdpe.pnRating;
  const bendHdpePeGrade = isHdpe
    ? rawSpecsBendHdpePeGrade || parsedBendPeGrade || rawGlobalHdpeGrade
    : undefined;
  const bendHdpeSdr = isHdpe ? rawSpecsBendHdpeSdr || parsedBendSdr || rawGlobalHdpeSdr : undefined;
  const bendGlobalPnRating = isHdpe
    ? (() => {
        const raw = rawGlobalHdpePressureRating;
        if (isNumber(raw)) return raw;
        if (isString(raw)) {
          const m = raw.match(/PN\s*(\d+(?:\.\d+)?)/i);
          return m ? Number(m[1]) : undefined;
        }
        return undefined;
      })()
    : undefined;
  const bendHdpePnRating = isHdpe
    ? rawSpecsBendHdpePnRating || parsedBendPn || bendGlobalPnRating
    : undefined;
  // PVC bend parsing — same shape as the pipe mapper.
  const bendIsPvc = entry.materialType === "pvc";
  const parsedFittingPvcForBend = bendIsPvc ? parsePvcFromDescription(rawDescription) : {};
  const rawSpecsBendPvcSdr = specs.pvcSdr;
  const rawSpecsBendPvcPressureClass = specs.pvcPressureClass;
  const rawSpecsBendPvcPnRating = specs.pvcPnRating;
  const rawGlobalBendPvcSdr = globalSpecs?.pvcSdr;
  const rawGlobalBendPvcPressureClass = globalSpecs?.pvcPressureClass;
  const rawGlobalBendPvcPressureRating = globalSpecs?.pvcPressureRating;
  const parsedBendPvcSdr = parsedFittingPvcForBend.sdr;
  const parsedBendPvcClass = parsedFittingPvcForBend.pressureClass;
  const parsedBendPvcPn = parsedFittingPvcForBend.pnRating;
  const bendPvcSdr = bendIsPvc
    ? rawSpecsBendPvcSdr || parsedBendPvcSdr || rawGlobalBendPvcSdr
    : undefined;
  const bendPvcPressureClass = bendIsPvc
    ? rawSpecsBendPvcPressureClass || parsedBendPvcClass || rawGlobalBendPvcPressureClass
    : undefined;
  const bendPvcGlobalPnRating = bendIsPvc
    ? (() => {
        const raw = rawGlobalBendPvcPressureRating;
        if (isNumber(raw)) return raw;
        if (isString(raw)) {
          const m = raw.match(/PN\s*(\d+(?:\.\d+)?)/i);
          return m ? Number(m[1]) : undefined;
        }
        return undefined;
      })()
    : undefined;
  const bendPvcPnRating = bendIsPvc
    ? rawSpecsBendPvcPnRating || parsedBendPvcPn || bendPvcGlobalPnRating
    : undefined;
  const bendMaterialType = isHdpe ? "hdpe" : bendIsPvc ? "pvc" : "steel";
  return {
    itemType: "bend" as const,
    description: rawDescription || "Bend Item",
    notes: entry.notes,
    totalWeightKg: rawTotalWeight || calculation.bendWeight,
    bend: {
      materialType: bendMaterialType,
      hdpePeGrade: bendHdpePeGrade,
      hdpeSdr: bendHdpeSdr,
      hdpePnRating: bendHdpePnRating,
      pvcSdr: bendPvcSdr,
      pvcPressureClass: bendPvcPressureClass,
      pvcPnRating: bendPvcPnRating,
      nominalBoreMm: specs.nominalBoreMm,
      // Backend requires a string. HDPE bends carry SDR info in the description
      // / globalSpecs and have no schedule number — pass empty string so the
      // backend DTO accepts the payload (steel bends will have a real value).
      scheduleNumber: rawBendScheduleNumber ?? "",
      wallThicknessMm: specs.wallThicknessMm,
      bendType: specs.bendType,
      bendRadiusType: specs.bendRadiusType,
      bendDegrees: specs.bendDegrees,
      bendEndConfiguration: specs.bendEndConfiguration,
      numberOfTangents: rawNumberOfTangents || 0,
      tangentLengths: rawTangentLengths || [],
      numberOfSegments: specs.numberOfSegments,
      centerToFaceMm: specs.centerToFaceMm,
      calculationData: {
        ...(calculation || {}),
        bendRadiusType: specs.bendRadiusType,
        stubs: rawStubs || [],
        stubLengths,
        numberOfSegments: specs.numberOfSegments,
        tangentLengths: rawTangentLengths || [],
      },
      quantityType: rawQuantityType || "number_of_items",
      quantityValue: rawQuantityValue || 1,
      workingPressureBar: rawWorkingPressureBar || gWpb || 10,
      workingTemperatureC: rawWorkingTemperatureC || gWtc || 20,
      steelSpecificationId: rawSteelSpecificationId || gSsid || 2,
      useGlobalFlangeSpecs: rawUseGlobalFlangeSpecs || true,
      flangeStandardId: rawFlangeStandardId || gFsid,
      flangePressureClassId: rawFlangePressureClassId || gFpcid,
    },
  };
}

function mapFittingItem(entry: any, specs: any, calculation: any, globalSpecs: any) {
  const rawDescription = entry.description;
  const rawTotalWeight = calculation.totalWeight;
  const rawAddBlankFlange = specs.addBlankFlange;
  const rawQuantityType = specs.quantityType;
  const rawQuantityValue = specs.quantityValue;
  const rawWorkingPressureBar = specs.workingPressureBar;
  const rawWorkingTemperatureC = specs.workingTemperatureC;
  const gsWorkingPressureBar = globalSpecs?.workingPressureBar;
  const gsWorkingTemperatureC = globalSpecs?.workingTemperatureC;
  // Same HDPE resolution chain as the pipe / bend mappers:
  // per-entry spec → description parse → globalSpecs.
  const fittingIsHdpe = entry.materialType === "hdpe";
  const parsedFittingHdpe = fittingIsHdpe ? parseHdpeFromDescription(rawDescription) : {};
  const rawSpecsFittingHdpePeGrade = specs.hdpePeGrade;
  const rawSpecsFittingHdpeSdr = specs.hdpeSdr;
  const rawSpecsFittingHdpePnRating = specs.hdpePnRating;
  const rawGlobalFittingHdpeGrade = globalSpecs?.hdpeGrade;
  const rawGlobalFittingHdpeSdr = globalSpecs?.hdpeSdr;
  const rawGlobalFittingHdpePressureRating = globalSpecs?.hdpePressureRating;
  const parsedFittingPeGrade = parsedFittingHdpe.peGrade;
  const parsedFittingSdr = parsedFittingHdpe.sdr;
  const parsedFittingPn = parsedFittingHdpe.pnRating;
  const fittingHdpePeGrade = fittingIsHdpe
    ? rawSpecsFittingHdpePeGrade || parsedFittingPeGrade || rawGlobalFittingHdpeGrade
    : undefined;
  const fittingHdpeSdr = fittingIsHdpe
    ? rawSpecsFittingHdpeSdr || parsedFittingSdr || rawGlobalFittingHdpeSdr
    : undefined;
  const fittingGlobalPnRating = fittingIsHdpe
    ? (() => {
        const raw = rawGlobalFittingHdpePressureRating;
        if (isNumber(raw)) return raw;
        if (isString(raw)) {
          const m = raw.match(/PN\s*(\d+(?:\.\d+)?)/i);
          return m ? Number(m[1]) : undefined;
        }
        return undefined;
      })()
    : undefined;
  const fittingHdpePnRating = fittingIsHdpe
    ? rawSpecsFittingHdpePnRating || parsedFittingPn || fittingGlobalPnRating
    : undefined;
  // PVC fitting parsing — same shape as pipe / bend mappers.
  const fittingIsPvc = entry.materialType === "pvc";
  const parsedFittingPvc = fittingIsPvc ? parsePvcFromDescription(rawDescription) : {};
  const rawSpecsFittingPvcSdr = specs.pvcSdr;
  const rawSpecsFittingPvcPressureClass = specs.pvcPressureClass;
  const rawSpecsFittingPvcPnRating = specs.pvcPnRating;
  const rawGlobalFittingPvcSdr = globalSpecs?.pvcSdr;
  const rawGlobalFittingPvcPressureClass = globalSpecs?.pvcPressureClass;
  const rawGlobalFittingPvcPressureRating = globalSpecs?.pvcPressureRating;
  const parsedFittingPvcSdr = parsedFittingPvc.sdr;
  const parsedFittingPvcClass = parsedFittingPvc.pressureClass;
  const parsedFittingPvcPn = parsedFittingPvc.pnRating;
  const fittingPvcSdr = fittingIsPvc
    ? rawSpecsFittingPvcSdr || parsedFittingPvcSdr || rawGlobalFittingPvcSdr
    : undefined;
  const fittingPvcPressureClass = fittingIsPvc
    ? rawSpecsFittingPvcPressureClass || parsedFittingPvcClass || rawGlobalFittingPvcPressureClass
    : undefined;
  const fittingPvcGlobalPnRating = fittingIsPvc
    ? (() => {
        const raw = rawGlobalFittingPvcPressureRating;
        if (isNumber(raw)) return raw;
        if (isString(raw)) {
          const m = raw.match(/PN\s*(\d+(?:\.\d+)?)/i);
          return m ? Number(m[1]) : undefined;
        }
        return undefined;
      })()
    : undefined;
  const fittingPvcPnRating = fittingIsPvc
    ? rawSpecsFittingPvcPnRating || parsedFittingPvcPn || fittingPvcGlobalPnRating
    : undefined;
  const fittingMaterialType = fittingIsHdpe ? "hdpe" : fittingIsPvc ? "pvc" : "steel";
  return {
    itemType: "fitting" as const,
    description: rawDescription || "Fitting Item",
    notes: entry.notes,
    totalWeightKg: rawTotalWeight || calculation.pipeWeight,
    fitting: {
      materialType: fittingMaterialType,
      hdpePeGrade: fittingHdpePeGrade,
      hdpeSdr: fittingHdpeSdr,
      hdpePnRating: fittingHdpePnRating,
      pvcSdr: fittingPvcSdr,
      pvcPressureClass: fittingPvcPressureClass,
      pvcPnRating: fittingPvcPnRating,
      nominalDiameterMm: specs.nominalDiameterMm,
      // Backend DTO requires @IsString(). Forms / NIX extraction
      // sometimes store this as a number (e.g. 40, 80) and HDPE
      // fittings have no schedule at all. Normalize: numbers →
      // their string form, missing → "".
      scheduleNumber: specs.scheduleNumber != null ? String(specs.scheduleNumber) : "",
      wallThicknessMm: specs.wallThicknessMm,
      fittingType: specs.fittingType,
      fittingStandard: specs.fittingStandard,
      pipeLengthAMm: specs.pipeLengthAMm,
      pipeLengthBMm: specs.pipeLengthBMm,
      pipeEndConfiguration: specs.pipeEndConfiguration,
      addBlankFlange: rawAddBlankFlange || false,
      blankFlangeCount: specs.blankFlangeCount,
      blankFlangePositions: specs.blankFlangePositions,
      quantityType: rawQuantityType || "number_of_items",
      quantityValue: rawQuantityValue || 1,
      workingPressureBar: rawWorkingPressureBar || gsWorkingPressureBar,
      workingTemperatureC: rawWorkingTemperatureC || gsWorkingTemperatureC,
      calculationData: calculation,
    },
  };
}

function mapTankChuteItem(entry: any, specs: any) {
  const rawDescription = entry.description;
  const rawAssemblyType = specs.assemblyType;
  const rawQuantityValue = specs.quantityValue;
  const rawLiningRequired = specs.liningRequired;
  const rawCoatingRequired = specs.coatingRequired;
  return {
    itemType: "tank_chute" as const,
    description: rawDescription || "Tank/Chute Item",
    notes: entry.notes,
    totalWeightKg: specs.totalSteelWeightKg,
    tankChute: {
      assemblyType: rawAssemblyType || "custom",
      drawingReference: specs.drawingReference,
      materialGrade: specs.materialGrade,
      overallLengthMm: specs.overallLengthMm,
      overallWidthMm: specs.overallWidthMm,
      overallHeightMm: specs.overallHeightMm,
      totalSteelWeightKg: specs.totalSteelWeightKg,
      weightSource: specs.weightSource,
      quantityValue: rawQuantityValue || 1,
      liningRequired: rawLiningRequired || false,
      liningType: specs.liningType,
      liningThicknessMm: specs.liningThicknessMm,
      liningAreaM2: specs.liningAreaM2,
      liningWastagePercent: specs.liningWastagePercent,
      rubberGrade: specs.rubberGrade,
      rubberHardnessShore: specs.rubberHardnessShore,
      coatingRequired: rawCoatingRequired || false,
      coatingSystem: specs.coatingSystem,
      coatingAreaM2: specs.coatingAreaM2,
      coatingWastagePercent: specs.coatingWastagePercent,
      surfacePrepStandard: specs.surfacePrepStandard,
      plateBom: specs.plateBom,
      bomTotalWeightKg: specs.bomTotalWeightKg,
      bomTotalAreaM2: specs.bomTotalAreaM2,
      steelPricePerKg: specs.steelPricePerKg,
      liningPricePerM2: specs.liningPricePerM2,
      coatingPricePerM2: specs.coatingPricePerM2,
      fabricationCost: specs.fabricationCost,
      totalCost: specs.totalCost,
    },
  };
}

function mapFastenerItem(entry: any, specs: any) {
  const rawDescription = entry.description;
  const rawFastenerCategory = specs.fastenerCategory;
  const rawSpecificType = specs.specificType;
  const rawSize = specs.size;
  const rawQuantityValue = specs.quantityValue;
  return {
    itemType: "fastener" as const,
    description: rawDescription || "Fastener Item",
    notes: entry.notes,
    totalWeightKg: undefined,
    fastener: {
      fastenerCategory: rawFastenerCategory || "bolt",
      specificType: rawSpecificType || "",
      size: rawSize || "",
      grade: specs.grade,
      material: specs.material,
      finish: specs.finish,
      threadType: specs.threadType,
      standard: specs.standard,
      lengthMm: specs.lengthMm,
      quantityValue: rawQuantityValue || 1,
    },
  };
}

// HDPE pipes carry their material spec in the description (e.g.
// "HDPE PE100 PN34 (SDR6)") rather than on structured spec fields,
// because the BOQ aggregator that creates these entries doesn't
// populate per-item HDPE values. Parse the description at submit
// time and fall back to globalSpecs when markers aren't present.
function parseHdpeFromDescription(description?: string): {
  peGrade?: string;
  sdr?: number;
  pnRating?: number;
} {
  if (!description) return {};
  const peMatch = description.match(/\bPE\s*(100|4710|80|63)\b/i);
  const sdrMatch = description.match(/\bSDR\s*([\d.]+)\b/i);
  const pnMatch = description.match(/\bPN\s*(\d+(?:\.\d+)?)\b/i);
  return {
    peGrade: peMatch ? `PE${peMatch[1]}`.toUpperCase() : undefined,
    sdr: sdrMatch ? Number(sdrMatch[1]) : undefined,
    pnRating: pnMatch ? Number(pnMatch[1]) : undefined,
  };
}

// PVC pipes use the same SDR/PN markers as HDPE but ALSO commonly
// quote a Pressure Class shorthand ("Class 12", "CL16"). Capture
// the class as a normalised string so the backend can look it up
// in the PVC pressure-class table.
function parsePvcFromDescription(description?: string): {
  sdr?: number;
  pnRating?: number;
  pressureClass?: string;
} {
  if (!description) return {};
  const sdrMatch = description.match(/\bSDR\s*([\d.]+)\b/i);
  const pnMatch = description.match(/\bPN\s*(\d+(?:\.\d+)?)\b/i);
  // "Class 16", "Cl12", "CL 9" etc.
  const classMatch = description.match(/\b(?:Class|Cl)\s*(\d+)\b/i);
  return {
    sdr: sdrMatch ? Number(sdrMatch[1]) : undefined,
    pnRating: pnMatch ? Number(pnMatch[1]) : undefined,
    pressureClass: classMatch ? `Class ${classMatch[1]}` : undefined,
  };
}

function mapStraightPipeItem(
  entry: any,
  specs: any,
  calculation: any,
  g: GlobalSpecsOverrides,
  globalSpecs: any,
) {
  const gWpb = g.workingPressureBar;
  const gWtc = g.workingTemperatureC;
  const gSsid = g.steelSpecificationId;
  const gFsid = g.flangeStandardId;
  const gFpcid = g.flangePressureClassId;
  const rawDescription = entry.description;
  const rawTotalSystemWeight = calculation.totalSystemWeight;
  const rawWorkingPressureBar = specs.workingPressureBar;
  const rawWorkingTemperatureC = specs.workingTemperatureC;
  const rawSteelSpecificationId = specs.steelSpecificationId;
  const rawFlangeStandardId = specs.flangeStandardId;
  const rawFlangePressureClassId = specs.flangePressureClassId;

  const isHdpe = entry.materialType === "hdpe";
  // For HDPE items, resolve PE grade / SDR / PN from (in order):
  //   1. per-entry spec fields if the BOQ creator ever populates them,
  //   2. the description text ("HDPE PE100 PN34 (SDR6)"),
  //   3. globalSpecs (single rfq-wide HDPE defaults).
  // Globally-set values are the weakest because mixed-SDR BOQs
  // (PN34/SDR6, PN20/SDR9, PN10/SDR17 in one rfq) would otherwise
  // collapse to one wrong value.
  const parsedHdpe = isHdpe ? parseHdpeFromDescription(rawDescription) : {};
  const rawSpecsHdpePeGrade = specs.hdpePeGrade;
  const rawSpecsHdpeSdr = specs.hdpeSdr;
  const rawSpecsHdpePnRating = specs.hdpePnRating;
  const rawGlobalHdpeGrade = globalSpecs?.hdpeGrade;
  const rawGlobalHdpeSdr = globalSpecs?.hdpeSdr;
  const rawGlobalHdpePressureRating = globalSpecs?.hdpePressureRating;
  const parsedPeGrade = parsedHdpe.peGrade;
  const parsedSdr = parsedHdpe.sdr;
  const parsedPn = parsedHdpe.pnRating;
  const hdpePeGrade = isHdpe
    ? rawSpecsHdpePeGrade || parsedPeGrade || rawGlobalHdpeGrade
    : undefined;
  const hdpeSdr = isHdpe ? rawSpecsHdpeSdr || parsedSdr || rawGlobalHdpeSdr : undefined;
  const globalPnRating = isHdpe
    ? (() => {
        const raw = rawGlobalHdpePressureRating;
        if (isNumber(raw)) return raw;
        if (isString(raw)) {
          const m = raw.match(/PN\s*(\d+(?:\.\d+)?)/i);
          return m ? Number(m[1]) : undefined;
        }
        return undefined;
      })()
    : undefined;
  const hdpePnRating = isHdpe ? rawSpecsHdpePnRating || parsedPn || globalPnRating : undefined;

  // PVC: same precedence chain — per-entry → description parse →
  // globalSpecs. PVC items can carry either an SDR or a Pressure
  // Class shorthand; both flow through.
  const isPvc = entry.materialType === "pvc";
  const parsedPvc = isPvc ? parsePvcFromDescription(rawDescription) : {};
  const rawSpecsPvcSdr = specs.pvcSdr;
  const rawSpecsPvcPressureClass = specs.pvcPressureClass;
  const rawSpecsPvcPnRating = specs.pvcPnRating;
  const rawGlobalPvcSdr = globalSpecs?.pvcSdr;
  const rawGlobalPvcPressureClass = globalSpecs?.pvcPressureClass;
  const rawGlobalPvcPressureRating = globalSpecs?.pvcPressureRating;
  const parsedPvcSdr = parsedPvc.sdr;
  const parsedPvcPn = parsedPvc.pnRating;
  const parsedPvcClass = parsedPvc.pressureClass;
  const pvcSdr = isPvc ? rawSpecsPvcSdr || parsedPvcSdr || rawGlobalPvcSdr : undefined;
  const pvcPressureClass = isPvc
    ? rawSpecsPvcPressureClass || parsedPvcClass || rawGlobalPvcPressureClass
    : undefined;
  const pvcGlobalPnRating = isPvc
    ? (() => {
        const raw = rawGlobalPvcPressureRating;
        if (isNumber(raw)) return raw;
        if (isString(raw)) {
          const m = raw.match(/PN\s*(\d+(?:\.\d+)?)/i);
          return m ? Number(m[1]) : undefined;
        }
        return undefined;
      })()
    : undefined;
  const pvcPnRating = isPvc ? rawSpecsPvcPnRating || parsedPvcPn || pvcGlobalPnRating : undefined;
  const resolvedMaterialType = isHdpe ? "hdpe" : isPvc ? "pvc" : "steel";

  return {
    itemType: "straight_pipe" as const,
    description: rawDescription || "Pipe Item",
    notes: entry.notes,
    totalWeightKg: rawTotalSystemWeight || calculation.totalPipeWeight,
    straightPipe: {
      materialType: resolvedMaterialType,
      hdpePeGrade,
      hdpeSdr,
      hdpePnRating,
      pvcSdr,
      pvcPressureClass,
      pvcPnRating,
      nominalBoreMm: specs.nominalBoreMm,
      scheduleType: specs.scheduleType,
      // Same string-coercion as the fitting mapper above.
      scheduleNumber: specs.scheduleNumber != null ? String(specs.scheduleNumber) : "",
      wallThicknessMm: specs.wallThicknessMm,
      pipeEndConfiguration: specs.pipeEndConfiguration,
      individualPipeLength: specs.individualPipeLength,
      lengthUnit: specs.lengthUnit,
      quantityType: specs.quantityType,
      quantityValue: specs.quantityValue,
      workingPressureBar: rawWorkingPressureBar || gWpb || 10,
      workingTemperatureC: rawWorkingTemperatureC || gWtc,
      // Steel-only fields stay null for HDPE so they don't seed
      // bogus steel relations on the persisted row.
      steelSpecificationId: isHdpe ? undefined : rawSteelSpecificationId || gSsid,
      flangeStandardId: isHdpe ? undefined : rawFlangeStandardId || gFsid,
      flangePressureClassId: isHdpe ? undefined : rawFlangePressureClassId || gFpcid,
    },
  };
}

export function mapItemToUnified(entry: any, g: GlobalSpecsOverrides, globalSpecs: any) {
  const rawSpecs = entry.specs;
  const specs = rawSpecs || {};
  const rawCalculation = entry.calculation;
  const calculation = rawCalculation || {};

  if (entry.itemType === "bend") {
    return mapBendItem(entry, specs, calculation, g, globalSpecs);
  } else if (entry.itemType === "fitting") {
    return mapFittingItem(entry, specs, calculation, globalSpecs);
  } else if (entry.itemType === "tank_chute") {
    return mapTankChuteItem(entry, specs);
  } else if (entry.itemType === "fastener") {
    return mapFastenerItem(entry, specs);
  } else if (entry.itemType === "straight_pipe") {
    return mapStraightPipeItem(entry, specs, calculation, g, globalSpecs);
  }
  // misc / unclassified items — Nix dropped them in but the backend's
  // UnifiedRfqItemDto has no shape for them (only the explicit types above).
  // Skip them rather than coerce into straightPipe with all-null required
  // fields, which the backend's class-validator rejects with a 400.
  return null;
}

export function countDroppedMiscItems(allItems: any[]): number {
  const knownTypes = new Set(["straight_pipe", "bend", "fitting", "tank_chute", "fastener"]);
  return allItems.filter((e: any) => !knownTypes.has(e.itemType)).length;
}

export function buildBoqConsolidation(
  allItems: any[],
  rfqData: any,
  masterData: any,
  allWeights: FlangeTypeWeightRecord[],
  allBnw: BnwSetWeightRecord[],
  allGaskets: GasketWeightRecord[],
) {
  const gsGasketType = rfqData.globalSpecs?.gasketType;
  const gsFlangeStandardId = rfqData.globalSpecs?.flangeStandardId;
  const gsFlangePressureClassId = rfqData.globalSpecs?.flangePressureClassId;
  const pressureClassDesignation = masterData?.pressureClasses?.find(
    (p: any) => p.id === gsFlangePressureClassId,
  )?.designation;

  return consolidateBoqData({
    lookups: buildFlangeLookups(allWeights, allBnw, allGaskets, FLANGE_OD),
    entries: allItems,
    globalSpecs: {
      gasketType: gsGasketType,
      pressureClassDesignation,
      flangeStandardId: gsFlangeStandardId,
      flangePressureClassId: gsFlangePressureClassId,
    },
    masterData: {
      flangeStandards: masterData?.flangeStandards,
      pressureClasses: masterData?.pressureClasses,
      steelSpecs: masterData?.steelSpecs,
    },
  });
}

export function buildCustomerProjectInfo(rfqData: any) {
  const rawCustomerName = rfqData.customerName;
  const rawCustomerEmail = rfqData.customerEmail;
  const rawProjectName = rfqData.projectName;
  return {
    customerInfo: {
      name: rawCustomerName || "Unknown",
      email: rawCustomerEmail || "",
      phone: rfqData.customerPhone,
    },
    projectInfo: {
      name: rawProjectName || "Untitled Project",
      description: rfqData.description,
      requiredDate: rfqData.requiredDate,
    },
  };
}

export function buildRfqPayload(rfqData: any, unifiedItems: any[], submissionId?: string) {
  return {
    rfq: {
      projectName: rfqData.projectName,
      description: rfqData.description,
      customerName: rfqData.customerName,
      customerEmail: rfqData.customerEmail,
      customerPhone: rfqData.customerPhone,
      requiredDate: rfqData.requiredDate,
      status: "submitted" as const,
      notes: rfqData.notes,
      // Client-generated idempotency key. Backend dedupes on this
      // so proxy retries / double-clicks / HMR resets can't
      // produce duplicate rfqs rows.
      submissionId,
    },
    items: unifiedItems,
  };
}

export function extractErrorMessage(error: any, defaultMessage: string): string {
  if (error.message) {
    return error.message;
  } else if (isString(error)) {
    return error;
  }
  return defaultMessage;
}

export async function submitBoqForRfq(
  rfqId: number,
  allItems: any[],
  rfqData: any,
  masterData: any,
  allWeights: FlangeTypeWeightRecord[],
  allBnw: BnwSetWeightRecord[],
  allGaskets: GasketWeightRecord[],
  boqApi: any,
) {
  const rawProjectName = rfqData.projectName;
  const boq = await boqApi.create({
    title: `BOQ for ${rawProjectName || "Untitled Project"}`,
    description: rfqData.description,
    rfqId,
  });
  log.debug(`BOQ ${boq.boqNumber} created with ID ${boq.id}`);

  const consolidatedData = buildBoqConsolidation(
    allItems,
    rfqData,
    masterData,
    allWeights,
    allBnw,
    allGaskets,
  );

  const { customerInfo, projectInfo } = buildCustomerProjectInfo(rfqData);

  const submitResult = await boqApi.submitForQuotation(boq.id, {
    boqData: consolidatedData,
    customerInfo,
    projectInfo,
  });

  log.debug(
    `BOQ submitted: ${submitResult.sectionsCreated} sections, ${submitResult.suppliersNotified} suppliers notified`,
  );

  return boq;
}
