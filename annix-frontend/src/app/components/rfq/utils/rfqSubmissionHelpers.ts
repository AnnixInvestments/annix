import { FLANGE_OD } from "@annix/product-data/pipe";
import { isString } from "es-toolkit/compat";
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

  const itemsRequiringCalculation = ["straight_pipe", "bend", "fitting"];
  const uncalculatedIndex = allItems.findIndex(
    (entry: any) => itemsRequiringCalculation.includes(entry.itemType) && !entry.calculation,
  );
  if (uncalculatedIndex !== -1) {
    const entry = allItems[uncalculatedIndex];
    const itemType =
      entry.itemType === "bend" ? "Bend" : entry.itemType === "fitting" ? "Fitting" : "Pipe";
    return `${itemType} #${uncalculatedIndex + 1} (${entry.description}) has not been calculated. Please calculate all items before ${action}.`;
  }

  return null;
}

function mapBendItem(entry: any, specs: any, calculation: any, g: GlobalSpecsOverrides) {
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
  return {
    itemType: "bend" as const,
    description: rawDescription || "Bend Item",
    notes: entry.notes,
    totalWeightKg: rawTotalWeight || calculation.bendWeight,
    bend: {
      nominalBoreMm: specs.nominalBoreMm,
      scheduleNumber: specs.scheduleNumber,
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
  return {
    itemType: "fitting" as const,
    description: rawDescription || "Fitting Item",
    notes: entry.notes,
    totalWeightKg: rawTotalWeight || calculation.pipeWeight,
    fitting: {
      nominalDiameterMm: specs.nominalDiameterMm,
      scheduleNumber: specs.scheduleNumber,
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

function mapStraightPipeItem(entry: any, specs: any, calculation: any, g: GlobalSpecsOverrides) {
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
  return {
    itemType: "straight_pipe" as const,
    description: rawDescription || "Pipe Item",
    notes: entry.notes,
    totalWeightKg: rawTotalSystemWeight || calculation.totalPipeWeight,
    straightPipe: {
      nominalBoreMm: specs.nominalBoreMm,
      scheduleType: specs.scheduleType,
      scheduleNumber: specs.scheduleNumber,
      wallThicknessMm: specs.wallThicknessMm,
      pipeEndConfiguration: specs.pipeEndConfiguration,
      individualPipeLength: specs.individualPipeLength,
      lengthUnit: specs.lengthUnit,
      quantityType: specs.quantityType,
      quantityValue: specs.quantityValue,
      workingPressureBar: rawWorkingPressureBar || gWpb || 10,
      workingTemperatureC: rawWorkingTemperatureC || gWtc,
      steelSpecificationId: rawSteelSpecificationId || gSsid,
      flangeStandardId: rawFlangeStandardId || gFsid,
      flangePressureClassId: rawFlangePressureClassId || gFpcid,
    },
  };
}

export function mapItemToUnified(entry: any, g: GlobalSpecsOverrides, globalSpecs: any) {
  const rawSpecs = entry.specs;
  const specs = rawSpecs || {};
  const rawCalculation = entry.calculation;
  const calculation = rawCalculation || {};

  if (entry.itemType === "bend") {
    return mapBendItem(entry, specs, calculation, g);
  } else if (entry.itemType === "fitting") {
    return mapFittingItem(entry, specs, calculation, globalSpecs);
  } else if (entry.itemType === "tank_chute") {
    return mapTankChuteItem(entry, specs);
  } else if (entry.itemType === "fastener") {
    return mapFastenerItem(entry, specs);
  } else {
    return mapStraightPipeItem(entry, specs, calculation, g);
  }
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

export function buildRfqPayload(rfqData: any, unifiedItems: any[]) {
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
