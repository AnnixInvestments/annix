import { ConsolidatedBoqDataDto, ConsolidatedItemDto } from "@/app/lib/api/client";
import {
  boltSetCountPerBend,
  boltSetCountPerFitting,
  boltSetCountPerPipe,
} from "@/app/lib/config/rfq/pipeEndOptions";
import type { FlangeLookupContext } from "@/app/lib/query/hooks";

export interface ConsolidationInput {
  lookups: FlangeLookupContext;
  entries: any[];
  globalSpecs?: {
    gasketType?: string;
    pressureClassDesignation?: string;
    flangeStandardId?: number;
    flangePressureClassId?: number;
    flangeTypeCode?: string;
    externalCoatingType?: string;
    externalCoatingConfirmed?: boolean;
    externalBlastingGrade?: string;
    externalPrimerType?: string;
    externalPrimerMicrons?: number;
    externalIntermediateType?: string;
    externalIntermediateMicrons?: number;
    externalTopcoatType?: string;
    externalTopcoatMicrons?: number;
    internalLiningType?: string;
    internalLiningConfirmed?: boolean;
    internalRubberType?: string;
    internalRubberThickness?: string;
    internalCeramicType?: string;
  };
  masterData?: {
    flangeStandards?: { id: number; code: string }[];
    pressureClasses?: { id: number; designation: string }[];
    steelSpecs?: { id: number; steelSpecName: string }[];
  };
}

interface ConsolidatedItem {
  description: string;
  qty: number;
  unit: string;
  weight: number;
  entries: number[];
  welds?: Record<string, number>;
  intAreaM2?: number;
  extAreaM2?: number;
}

function flangeSpec(
  entry: any,
  globalSpecs?: ConsolidationInput["globalSpecs"],
  masterData?: ConsolidationInput["masterData"],
): { spec: string; standard: string; pressureClass: string; flangeTypeCode?: string } {
  const rawFlangeStandardId = entry.specs?.flangeStandardId;
  const flangeStandardId = rawFlangeStandardId || globalSpecs?.flangeStandardId;
  const rawFlangePressureClassId = entry.specs?.flangePressureClassId;
  const flangePressureClassId = rawFlangePressureClassId || globalSpecs?.flangePressureClassId;
  const rawCode = masterData.flangeStandards.find((s) => s.id === flangeStandardId)?.code;
  const flangeStandard = flangeStandardId && masterData?.flangeStandards ? rawCode || "" : "";
  const rawDesignation = masterData.pressureClasses.find(
    (p) => p.id === flangePressureClassId,
  )?.designation;
  const rawPressureClassDesignation = globalSpecs?.pressureClassDesignation;
  const pressureClass =
    flangePressureClassId && masterData?.pressureClasses
      ? rawDesignation || globalSpecs?.pressureClassDesignation || "PN16"
      : rawPressureClassDesignation || "PN16";
  const rawFlangeTypeCode = entry.specs?.flangeTypeCode;
  const flangeTypeCode = rawFlangeTypeCode || globalSpecs?.flangeTypeCode;
  const spec =
    flangeStandard && pressureClass ? `${flangeStandard} ${pressureClass}` : pressureClass;
  return { spec, standard: flangeStandard, pressureClass, flangeTypeCode };
}

function getFlangeCountFromConfig(
  config: string,
  itemType: string,
): { main: number; branch: number } {
  if (itemType === "bend" || itemType === "straight_pipe" || !itemType) {
    switch (config) {
      case "PE":
        return { main: 0, branch: 0 };
      case "FOE":
        return { main: 1, branch: 0 };
      case "FBE":
        return { main: 2, branch: 0 };
      case "FOE_LF":
        return { main: 2, branch: 0 };
      case "FOE_RF":
        return { main: 2, branch: 0 };
      case "2X_RF":
        return { main: 2, branch: 0 };
      case "2xLF":
        return { main: 4, branch: 0 };
      default:
        return { main: 0, branch: 0 };
    }
  }
  if (itemType === "fitting") {
    switch (config) {
      case "PE":
        return { main: 0, branch: 0 };
      case "FAE":
      case "FFF":
        return { main: 2, branch: 1 };
      case "F2E":
      case "FFP":
        return { main: 2, branch: 0 };
      case "F2E_RF":
      case "F2E_LF":
        return { main: 1, branch: 1 };
      case "PFF":
        return { main: 1, branch: 1 };
      case "PPF":
        return { main: 0, branch: 1 };
      case "FPP":
        return { main: 1, branch: 0 };
      case "PFP":
        return { main: 1, branch: 0 };
      default:
        return { main: 0, branch: 0 };
    }
  }
  return { main: 0, branch: 0 };
}

function getFlangeTypeName(config: string): string {
  if (!config || config === "PE") return "Slip On";
  if (config.includes("LF") || config.includes("_L")) return "Slip On";
  if (config.includes("RF") || config.includes("_R")) return "Rotating";
  return "Slip On";
}

function localBlankFlangeWeight(
  lookups: FlangeLookupContext,
  nbMm: number,
  pressureClass: string,
  flangeStandard: string,
): number {
  const isSans =
    pressureClass.match(/^\d+\/\d$/) ||
    flangeStandard.toUpperCase().includes("SANS") ||
    flangeStandard.toUpperCase().includes("SABS");
  if (isSans) {
    return lookups.sansBlankFlangeWeight(nbMm, pressureClass);
  }
  return lookups.blankFlangeWeight(nbMm, pressureClass);
}

interface ExtendedConsolidatedBoqData extends ConsolidatedBoqDataDto {
  externalCoating?: ConsolidatedItemDto[];
  rubberLining?: ConsolidatedItemDto[];
  ceramicLining?: ConsolidatedItemDto[];
}

export function consolidateBoqData(input: ConsolidationInput): ExtendedConsolidatedBoqData {
  const { entries, globalSpecs, masterData, lookups } = input;

  const consolidatedPipes: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBends: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFittings: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFlanges: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBnwSets: Map<string, ConsolidatedItem> = new Map();
  const consolidatedGaskets: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBlankFlanges: Map<string, ConsolidatedItem> = new Map();
  const consolidatedValves: Map<string, ConsolidatedItem> = new Map();
  const consolidatedInstruments: Map<string, ConsolidatedItem> = new Map();
  const consolidatedPumps: Map<string, ConsolidatedItem> = new Map();
  const consolidatedPumpParts: Map<string, ConsolidatedItem> = new Map();
  const consolidatedPumpSpares: Map<string, ConsolidatedItem> = new Map();
  const consolidatedExternalCoating: Map<string, ConsolidatedItem> = new Map();
  const consolidatedRubberLining: Map<string, ConsolidatedItem> = new Map();
  const consolidatedCeramicLining: Map<string, ConsolidatedItem> = new Map();
  const consolidatedSurfaceProtection: Map<string, ConsolidatedItem> = new Map();

  const totalExternalAreaM2 = 0;
  const totalInternalAreaM2 = 0;

  entries.forEach((entry, index) => {
    const itemNumber = index + 1;
    const rawQuantityValue = entry.specs?.quantityValue;
    const qty = rawQuantityValue || entry.calculation?.calculatedPipeCount || 1;
    const {
      spec: flangeSpecStr,
      standard: flangeStandard,
      pressureClass,
      flangeTypeCode,
    } = flangeSpec(entry, globalSpecs, masterData);

    if (entry.itemType === "bend") {
      const rawNominalBoreMm = entry.specs?.nominalBoreMm;
      const nb = rawNominalBoreMm || 100;
      const rawBendEndConfiguration = entry.specs?.bendEndConfiguration;
      const bendEndConfig = rawBendEndConfiguration || "PE";
      const flangeCount = getFlangeCountFromConfig(bendEndConfig, "bend");
      const flangeTypeName = getFlangeTypeName(bendEndConfig);

      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpecStr}_${flangeTypeName}`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * qty;
        const flangeWeight = lookups.flangeWeight(
          nb,
          pressureClass,
          flangeStandard,
          flangeTypeCode || "",
        );

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeight * flangeQty;
          existingFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB ${flangeTypeName} Flange ${flangeSpecStr}`,
            qty: flangeQty,
            unit: "Each",
            weight: flangeWeight * flangeQty,
            entries: [itemNumber],
          });
        }

        const bnwInfo = lookups.bnwSetInfo(nb, pressureClass);
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpecStr}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
        const boltSetQty = boltSetCountPerBend(bendEndConfig) * qty;

        if (boltSetQty > 0) {
          if (existingBnw) {
            existingBnw.qty += boltSetQty;
            existingBnw.weight += bnwWeight * boltSetQty;
            existingBnw.entries.push(itemNumber);
          } else {
            consolidatedBnwSets.set(bnwKey, {
              description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpecStr}`,
              qty: boltSetQty,
              unit: "sets",
              weight: bnwWeight * boltSetQty,
              entries: [itemNumber],
            });
          }
        }

        if (globalSpecs?.gasketType) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpecStr}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = lookups.gasketWeight(globalSpecs.gasketType, nb);
          const gasketQty = boltSetQty;

          if (gasketQty > 0) {
            if (existingGasket) {
              existingGasket.qty += gasketQty;
              existingGasket.weight += gasketWeight * gasketQty;
              existingGasket.entries.push(itemNumber);
            } else {
              consolidatedGaskets.set(gasketKey, {
                description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpecStr}`,
                qty: gasketQty,
                unit: "Each",
                weight: gasketWeight * gasketQty,
                entries: [itemNumber],
              });
            }
          }
        }
      }

      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const rawBlankFlangeNominalBoreMm = entry.specs?.blankFlangeNominalBoreMm;
        const blankNb = rawBlankFlangeNominalBoreMm || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpecStr}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * qty;
        const blankWeight = localBlankFlangeWeight(lookups, blankNb, pressureClass, flangeStandard);
        const blankSurfaceArea = lookups.blankFlangeSurfaceArea(blankNb);

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          existingBlank.entries.push(itemNumber);
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpecStr}`,
            qty: blankQty,
            unit: "Each",
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            extAreaM2: blankSurfaceArea.external * blankQty,
            intAreaM2: blankSurfaceArea.internal * blankQty,
          });
        }
      }
    } else if (entry.itemType === "fitting") {
      const rawNominalDiameterMm = entry.specs?.nominalDiameterMm;
      const nb = rawNominalDiameterMm || entry.specs?.nominalBoreMm || 100;
      const rawBranchNominalDiameterMm = entry.specs?.branchNominalDiameterMm;
      const branchNb = rawBranchNominalDiameterMm || nb;
      const rawPipeEndConfiguration = entry.specs?.pipeEndConfiguration;
      const fittingEndConfig = rawPipeEndConfiguration || "PE";
      const flangeCount = getFlangeCountFromConfig(fittingEndConfig, "fitting");
      const flangeTypeName = getFlangeTypeName(fittingEndConfig);
      const isEqualBranch = branchNb === nb;
      const fittingBoltSets = boltSetCountPerFitting(fittingEndConfig, isEqualBranch);

      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpecStr}_${flangeTypeName}`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * qty;
        const flangeWeight = lookups.flangeWeight(
          nb,
          pressureClass,
          flangeStandard,
          flangeTypeCode || "",
        );

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeight * flangeQty;
          existingFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB ${flangeTypeName} Flange ${flangeSpecStr}`,
            qty: flangeQty,
            unit: "Each",
            weight: flangeWeight * flangeQty,
            entries: [itemNumber],
          });
        }

        const bnwInfo = lookups.bnwSetInfo(nb, pressureClass);
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpecStr}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
        const mainBoltSetQty = fittingBoltSets.mainBoltSets * qty;

        if (mainBoltSetQty > 0) {
          if (existingBnw) {
            existingBnw.qty += mainBoltSetQty;
            existingBnw.weight += bnwWeight * mainBoltSetQty;
            existingBnw.entries.push(itemNumber);
          } else {
            consolidatedBnwSets.set(bnwKey, {
              description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpecStr}`,
              qty: mainBoltSetQty,
              unit: "sets",
              weight: bnwWeight * mainBoltSetQty,
              entries: [itemNumber],
            });
          }
        }

        if (globalSpecs?.gasketType && mainBoltSetQty > 0) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpecStr}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = lookups.gasketWeight(globalSpecs.gasketType, nb);

          if (existingGasket) {
            existingGasket.qty += mainBoltSetQty;
            existingGasket.weight += gasketWeight * mainBoltSetQty;
            existingGasket.entries.push(itemNumber);
          } else {
            consolidatedGaskets.set(gasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpecStr}`,
              qty: mainBoltSetQty,
              unit: "Each",
              weight: gasketWeight * mainBoltSetQty,
              entries: [itemNumber],
            });
          }
        }
      }

      if (flangeCount.branch > 0 && branchNb !== nb) {
        const branchFlangeKey = `FLANGE_${branchNb}_${flangeSpecStr}_${flangeTypeName}`;
        const existingBranchFlange = consolidatedFlanges.get(branchFlangeKey);
        const branchFlangeQty = flangeCount.branch * qty;
        const branchFlangeWeight = lookups.flangeWeight(
          branchNb,
          pressureClass,
          flangeStandard,
          flangeTypeCode || "",
        );

        if (existingBranchFlange) {
          existingBranchFlange.qty += branchFlangeQty;
          existingBranchFlange.weight += branchFlangeWeight * branchFlangeQty;
          existingBranchFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(branchFlangeKey, {
            description: `${branchNb}NB ${flangeTypeName} Flange ${flangeSpecStr}`,
            qty: branchFlangeQty,
            unit: "Each",
            weight: branchFlangeWeight * branchFlangeQty,
            entries: [itemNumber],
          });
        }

        const branchBnwInfo = lookups.bnwSetInfo(branchNb, pressureClass);
        const branchBnwKey = `BNW_${branchBnwInfo.boltSize}_x${branchBnwInfo.holesPerFlange}_${branchNb}NB_${flangeSpecStr}`;
        const existingBranchBnw = consolidatedBnwSets.get(branchBnwKey);
        const branchBnwWeight = branchBnwInfo.weightPerHole * branchBnwInfo.holesPerFlange;
        const branchBoltSetQty = fittingBoltSets.branchBoltSets * qty;

        if (branchBoltSetQty > 0) {
          if (existingBranchBnw) {
            existingBranchBnw.qty += branchBoltSetQty;
            existingBranchBnw.weight += branchBnwWeight * branchBoltSetQty;
            existingBranchBnw.entries.push(itemNumber);
          } else {
            consolidatedBnwSets.set(branchBnwKey, {
              description: `${branchBnwInfo.boltSize} BNW Set x${branchBnwInfo.holesPerFlange} for ${branchNb}NB ${flangeSpecStr}`,
              qty: branchBoltSetQty,
              unit: "sets",
              weight: branchBnwWeight * branchBoltSetQty,
              entries: [itemNumber],
            });
          }
        }

        if (globalSpecs?.gasketType && branchBoltSetQty > 0) {
          const branchGasketKey = `GASKET_${globalSpecs.gasketType}_${branchNb}NB_${flangeSpecStr}`;
          const existingBranchGasket = consolidatedGaskets.get(branchGasketKey);
          const branchGasketWeight = lookups.gasketWeight(globalSpecs.gasketType, branchNb);

          if (existingBranchGasket) {
            existingBranchGasket.qty += branchBoltSetQty;
            existingBranchGasket.weight += branchGasketWeight * branchBoltSetQty;
            existingBranchGasket.entries.push(itemNumber);
          } else {
            consolidatedGaskets.set(branchGasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${branchNb}NB ${flangeSpecStr}`,
              qty: branchBoltSetQty,
              unit: "Each",
              weight: branchGasketWeight * branchBoltSetQty,
              entries: [itemNumber],
            });
          }
        }
      }

      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const rawBlankFlangeNominalBoreMm2 = entry.specs?.blankFlangeNominalBoreMm;
        const blankNb = rawBlankFlangeNominalBoreMm2 || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpecStr}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * qty;
        const blankWeight = localBlankFlangeWeight(lookups, blankNb, pressureClass, flangeStandard);
        const blankSurfaceArea = lookups.blankFlangeSurfaceArea(blankNb);

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          existingBlank.entries.push(itemNumber);
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpecStr}`,
            qty: blankQty,
            unit: "Each",
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            extAreaM2: blankSurfaceArea.external * blankQty,
            intAreaM2: blankSurfaceArea.internal * blankQty,
          });
        }
      }
    } else if (entry.itemType === "valve") {
      const rawValveType = entry.specs?.valveType;
      const valveType = rawValveType || "valve";
      const rawSize = entry.specs?.size;
      const size = rawSize || "DN100";
      const rawPressureClass = entry.specs?.pressureClass;
      const pressureClass = rawPressureClass || "Class 150";
      const rawBodyMaterial = entry.specs?.bodyMaterial;
      const bodyMaterial = rawBodyMaterial || "CF8M";
      const rawActuatorType = entry.specs?.actuatorType;
      const actuatorType = rawActuatorType || "manual";

      const valveKey = `VALVE_${valveType}_${size}_${pressureClass}_${bodyMaterial}_${actuatorType}`;
      const existingValve = consolidatedValves.get(valveKey);

      const description = `${size} ${valveType.replace(/_/g, " ")} ${pressureClass} ${bodyMaterial}${actuatorType !== "manual" ? ` (${actuatorType})` : ""}`;

      if (existingValve) {
        existingValve.qty += qty;
        existingValve.entries.push(itemNumber);
      } else {
        consolidatedValves.set(valveKey, {
          description,
          qty,
          unit: "Each",
          weight: 0,
          entries: [itemNumber],
        });
      }
    } else if (entry.itemType === "instrument") {
      const rawInstrumentType = entry.specs?.instrumentType;
      const instrumentType = rawInstrumentType || "instrument";
      const rawInstrumentCategory = entry.specs?.instrumentCategory;
      const instrumentCategory = rawInstrumentCategory || "flow";
      const rawSize2 = entry.specs?.size;
      const size = rawSize2 || "";
      const rawProcessConnection = entry.specs?.processConnection;
      const processConnection = rawProcessConnection || "";

      const instrumentKey = `INSTRUMENT_${instrumentCategory}_${instrumentType}_${size}_${processConnection}`;
      const existingInstrument = consolidatedInstruments.get(instrumentKey);

      const description = `${instrumentType.replace(/_/g, " ")}${size ? ` ${size}` : ""}${processConnection ? ` ${processConnection}` : ""}`;

      if (existingInstrument) {
        existingInstrument.qty += qty;
        existingInstrument.entries.push(itemNumber);
      } else {
        consolidatedInstruments.set(instrumentKey, {
          description,
          qty,
          unit: "Each",
          weight: 0,
          entries: [itemNumber],
        });
      }
    } else if (entry.itemType === "pump") {
      const rawPumpType = entry.specs?.pumpType;
      const pumpType = rawPumpType || "centrifugal";
      const rawManufacturer = entry.specs?.manufacturer;
      const manufacturer = rawManufacturer || "";
      const rawModel = entry.specs?.model;
      const model = rawModel || "";
      const rawFlowRateM3h = entry.specs?.flowRateM3h;
      const flowRate = rawFlowRateM3h || "";
      const rawHeadM = entry.specs?.headM;
      const head = rawHeadM || "";
      const rawMotorPowerKw = entry.specs?.motorPowerKw;
      const power = rawMotorPowerKw || "";
      const rawWetEndMaterial = entry.specs?.wetEndMaterial;
      const material = rawWetEndMaterial || "";
      const rawSealType = entry.specs?.sealType;
      const sealType = rawSealType || "";
      const rawEstimatedWeightKg = entry.specs?.estimatedWeightKg;
      const estimatedWeight = rawEstimatedWeightKg || 0;

      const pumpKey = `PUMP_${pumpType}_${manufacturer}_${model}_${flowRate}_${head}_${material}`;
      const existingPump = consolidatedPumps.get(pumpKey);

      const descriptionParts = [
        pumpType.replace(/_/g, " "),
        manufacturer,
        model,
        flowRate ? `${flowRate} m³/h` : "",
        head ? `${head}m head` : "",
        power ? `${power}kW` : "",
        material,
        sealType ? `${sealType} seal` : "",
      ].filter(Boolean);

      const description = descriptionParts.join(" ");

      if (existingPump) {
        existingPump.qty += qty;
        existingPump.weight += estimatedWeight * qty;
        existingPump.entries.push(itemNumber);
      } else {
        consolidatedPumps.set(pumpKey, {
          description,
          qty,
          unit: "Each",
          weight: estimatedWeight * qty,
          entries: [itemNumber],
        });
      }
    } else if (entry.itemType === "pump_part") {
      const rawPartType = entry.specs?.partType;
      const partType = rawPartType || "part";
      const rawPartDescription = entry.specs?.partDescription;
      const partDescription = rawPartDescription || "";
      const rawPartNumber = entry.specs?.partNumber;
      const partNumber = rawPartNumber || "";
      const rawMaterial = entry.specs?.material;
      const material = rawMaterial || "";
      const rawEstimatedWeightKg2 = entry.specs?.estimatedWeightKg;
      const estimatedWeight = rawEstimatedWeightKg2 || 0;

      const partKey = `PUMP_PART_${partType}_${partNumber}_${material}`;
      const existingPart = consolidatedPumpParts.get(partKey);

      const descriptionParts = [
        partType.replace(/_/g, " "),
        partDescription,
        partNumber ? `P/N: ${partNumber}` : "",
        material,
      ].filter(Boolean);

      const description = descriptionParts.join(" ");

      if (existingPart) {
        existingPart.qty += qty;
        existingPart.weight += estimatedWeight * qty;
        existingPart.entries.push(itemNumber);
      } else {
        consolidatedPumpParts.set(partKey, {
          description,
          qty,
          unit: "Each",
          weight: estimatedWeight * qty,
          entries: [itemNumber],
        });
      }
    } else if (entry.itemType === "pump_spare") {
      const rawSpareType = entry.specs?.spareType;
      const spareType = rawSpareType || "spare";
      const rawSpareDescription = entry.specs?.spareDescription;
      const spareDescription = rawSpareDescription || "";
      const rawPartNumber2 = entry.specs?.partNumber;
      const partNumber = rawPartNumber2 || "";
      const rawOemPartNumber = entry.specs?.oemPartNumber;
      const oemPartNumber = rawOemPartNumber || "";
      const rawMaterial2 = entry.specs?.material;
      const material = rawMaterial2 || "";
      const rawEstimatedWeightKg3 = entry.specs?.estimatedWeightKg;
      const estimatedWeight = rawEstimatedWeightKg3 || 0;

      const spareKey = `PUMP_SPARE_${spareType}_${partNumber}_${oemPartNumber}_${material}`;
      const existingSpare = consolidatedPumpSpares.get(spareKey);

      const descriptionParts = [
        spareType.replace(/_/g, " "),
        spareDescription,
        partNumber ? `P/N: ${partNumber}` : "",
        oemPartNumber ? `OEM: ${oemPartNumber}` : "",
        material,
      ].filter(Boolean);

      const description = descriptionParts.join(" ");

      if (existingSpare) {
        existingSpare.qty += qty;
        existingSpare.weight += estimatedWeight * qty;
        existingSpare.entries.push(itemNumber);
      } else {
        consolidatedPumpSpares.set(spareKey, {
          description,
          qty,
          unit: "Each",
          weight: estimatedWeight * qty,
          entries: [itemNumber],
        });
      }
    } else {
      const rawNominalBoreMm2 = entry.specs?.nominalBoreMm;
      const nb = rawNominalBoreMm2 || 100;
      const rawPipeEndConfiguration2 = entry.specs?.pipeEndConfiguration;
      const pipeEndConfig = rawPipeEndConfiguration2 || "PE";
      const flangeCount = getFlangeCountFromConfig(pipeEndConfig, "straight_pipe");
      const flangeTypeName = getFlangeTypeName(pipeEndConfig);
      const rawCalculatedPipeCount = entry.calculation?.calculatedPipeCount;
      const pipeQty = rawCalculatedPipeCount || qty;

      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpecStr}_${flangeTypeName}`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * pipeQty;
        const flangeWeight = lookups.flangeWeight(
          nb,
          pressureClass,
          flangeStandard,
          flangeTypeCode || "",
        );

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeight * flangeQty;
          existingFlange.entries.push(itemNumber);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB ${flangeTypeName} Flange ${flangeSpecStr}`,
            qty: flangeQty,
            unit: "Each",
            weight: flangeWeight * flangeQty,
            entries: [itemNumber],
          });
        }

        const bnwInfo = lookups.bnwSetInfo(nb, pressureClass);
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpecStr}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
        const pipeBoltSetQty = boltSetCountPerPipe(pipeEndConfig) * pipeQty;

        if (pipeBoltSetQty > 0) {
          if (existingBnw) {
            existingBnw.qty += pipeBoltSetQty;
            existingBnw.weight += bnwWeight * pipeBoltSetQty;
            existingBnw.entries.push(itemNumber);
          } else {
            consolidatedBnwSets.set(bnwKey, {
              description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpecStr}`,
              qty: pipeBoltSetQty,
              unit: "sets",
              weight: bnwWeight * pipeBoltSetQty,
              entries: [itemNumber],
            });
          }
        }

        if (globalSpecs?.gasketType && pipeBoltSetQty > 0) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpecStr}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = lookups.gasketWeight(globalSpecs.gasketType, nb);

          if (existingGasket) {
            existingGasket.qty += pipeBoltSetQty;
            existingGasket.weight += gasketWeight * pipeBoltSetQty;
            existingGasket.entries.push(itemNumber);
          } else {
            consolidatedGaskets.set(gasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpecStr}`,
              qty: pipeBoltSetQty,
              unit: "Each",
              weight: gasketWeight * pipeBoltSetQty,
              entries: [itemNumber],
            });
          }
        }
      }

      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const rawBlankFlangeNominalBoreMm3 = entry.specs?.blankFlangeNominalBoreMm;
        const blankNb = rawBlankFlangeNominalBoreMm3 || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpecStr}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * pipeQty;
        const blankWeight = localBlankFlangeWeight(lookups, blankNb, pressureClass, flangeStandard);
        const blankSurfaceArea = lookups.blankFlangeSurfaceArea(blankNb);

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          existingBlank.entries.push(itemNumber);
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpecStr}`,
            qty: blankQty,
            unit: "Each",
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            extAreaM2: blankSurfaceArea.external * blankQty,
            intAreaM2: blankSurfaceArea.internal * blankQty,
          });
        }
      }
    }
  });

  if (globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingType) {
    const rawExternalPrimerMicrons = globalSpecs.externalPrimerMicrons;
    const rawExternalIntermediateMicrons = globalSpecs.externalIntermediateMicrons;
    const rawExternalTopcoatMicrons = globalSpecs.externalTopcoatMicrons;
    const totalDft =
      (rawExternalPrimerMicrons || 0) +
      (rawExternalIntermediateMicrons || 0) +
      (rawExternalTopcoatMicrons || 0);

    const coatingKey = `EXT_COAT_${globalSpecs.externalCoatingType}_${totalDft}`;
    const rawExternalBlastingGrade = globalSpecs.externalBlastingGrade;
    const description = `External Coating: ${globalSpecs.externalCoatingType} System, ${totalDft}um DFT, ${rawExternalBlastingGrade || "Sa 2.5"} prep`;

    const coatingArea = Array.from(consolidatedBlankFlanges.values()).reduce((sum, item) => {
      const rawExtAreaM2 = item.extAreaM2;
      return sum + (rawExtAreaM2 || 0);
    }, 0);

    consolidatedExternalCoating.set(coatingKey, {
      description,
      qty: 1,
      unit: "m2",
      weight: 0,
      entries: [],
      extAreaM2: coatingArea || totalExternalAreaM2,
    });

    consolidatedSurfaceProtection.set(coatingKey, {
      description,
      qty: 1,
      unit: "m2",
      weight: 0,
      entries: [],
      extAreaM2: coatingArea || totalExternalAreaM2,
    });
  }

  if (globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType) {
    const liningArea = Array.from(consolidatedBlankFlanges.values()).reduce((sum, item) => {
      const rawIntAreaM2 = item.intAreaM2;
      return sum + (rawIntAreaM2 || 0);
    }, 0);

    if (globalSpecs.internalRubberType) {
      const rawInternalRubberThickness = globalSpecs.internalRubberThickness;
      const rubberKey = `RUBBER_${globalSpecs.internalRubberType}_${rawInternalRubberThickness || "6mm"}`;
      const rawInternalRubberThickness2 = globalSpecs.internalRubberThickness;
      const description = `Rubber Lining: ${globalSpecs.internalRubberType}, ${rawInternalRubberThickness2 || "6mm"} thickness`;

      consolidatedRubberLining.set(rubberKey, {
        description,
        qty: 1,
        unit: "m2",
        weight: 0,
        entries: [],
        intAreaM2: liningArea || totalInternalAreaM2,
      });

      consolidatedSurfaceProtection.set(rubberKey, {
        description,
        qty: 1,
        unit: "m2",
        weight: 0,
        entries: [],
        intAreaM2: liningArea || totalInternalAreaM2,
      });
    }

    if (globalSpecs.internalCeramicType) {
      const ceramicKey = `CERAMIC_${globalSpecs.internalCeramicType}`;
      const description = `Ceramic Lining: ${globalSpecs.internalCeramicType}`;

      consolidatedCeramicLining.set(ceramicKey, {
        description,
        qty: 1,
        unit: "m2",
        weight: 0,
        entries: [],
        intAreaM2: liningArea || totalInternalAreaM2,
      });

      consolidatedSurfaceProtection.set(ceramicKey, {
        description,
        qty: 1,
        unit: "m2",
        weight: 0,
        entries: [],
        intAreaM2: liningArea || totalInternalAreaM2,
      });
    }

    if (!globalSpecs.internalRubberType && !globalSpecs.internalCeramicType) {
      const liningKey = `LINING_${globalSpecs.internalLiningType}`;
      const description = `Internal Lining: ${globalSpecs.internalLiningType}`;

      consolidatedSurfaceProtection.set(liningKey, {
        description,
        qty: 1,
        unit: "m2",
        weight: 0,
        entries: [],
        intAreaM2: liningArea || totalInternalAreaM2,
      });
    }
  }

  const mapToDto = (items: Map<string, ConsolidatedItem>): ConsolidatedItemDto[] => {
    return Array.from(items.values()).map((item) => {
      const rawIntAreaM22 = item.intAreaM2;

      return {
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        weightKg: item.weight,
        entries: item.entries,

        welds: item.welds
          ? {
              pipeWeld: item.welds["Pipe Weld"],
              flangeWeld: item.welds["Flange Weld"],
              mitreWeld: item.welds["Mitre Weld"],
              teeWeld: item.welds["Tee Weld"],
              gussetTeeWeld: item.welds["Gusset Tee Weld"],
              latWeld45Plus: item.welds["Lat Weld 45+"],
              latWeldUnder45: item.welds["Lat Weld <45"],
            }
          : undefined,

        areas:
          rawIntAreaM22 || item.extAreaM2
            ? {
                intAreaM2: item.intAreaM2,
                extAreaM2: item.extAreaM2,
              }
            : undefined,
      };
    });
  };

  return {
    flanges: consolidatedFlanges.size > 0 ? mapToDto(consolidatedFlanges) : undefined,
    blankFlanges:
      consolidatedBlankFlanges.size > 0 ? mapToDto(consolidatedBlankFlanges) : undefined,
    bnwSets: consolidatedBnwSets.size > 0 ? mapToDto(consolidatedBnwSets) : undefined,
    gaskets: consolidatedGaskets.size > 0 ? mapToDto(consolidatedGaskets) : undefined,
    valves: consolidatedValves.size > 0 ? mapToDto(consolidatedValves) : undefined,
    instruments: consolidatedInstruments.size > 0 ? mapToDto(consolidatedInstruments) : undefined,
    pumps: consolidatedPumps.size > 0 ? mapToDto(consolidatedPumps) : undefined,
    pumpParts: consolidatedPumpParts.size > 0 ? mapToDto(consolidatedPumpParts) : undefined,
    pumpSpares: consolidatedPumpSpares.size > 0 ? mapToDto(consolidatedPumpSpares) : undefined,
    surfaceProtection:
      consolidatedSurfaceProtection.size > 0 ? mapToDto(consolidatedSurfaceProtection) : undefined,
    externalCoating:
      consolidatedExternalCoating.size > 0 ? mapToDto(consolidatedExternalCoating) : undefined,
    rubberLining:
      consolidatedRubberLining.size > 0 ? mapToDto(consolidatedRubberLining) : undefined,
    ceramicLining:
      consolidatedCeramicLining.size > 0 ? mapToDto(consolidatedCeramicLining) : undefined,
  };
}
