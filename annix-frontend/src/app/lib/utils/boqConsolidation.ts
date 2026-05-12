import {
  fallbackBendWeight,
  fallbackFittingWeight,
  fallbackPipeWeight,
  resolveHdpeDims,
} from "@/app/components/rfq/steps/boq/calc";
import { detectPipeVariant } from "@/app/components/rfq/steps/boq/helpers";
import { ConsolidatedBoqDataDto, ConsolidatedItemDto } from "@/app/lib/api/client";
import { DEFAULT_PIPE_LENGTH_M } from "@/app/lib/config/rfq";
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
    // HDPE / PVC fields needed by pipe/bend/fitting consolidation —
    // optional everywhere, read with ?. so legacy callers still work.
    hdpeSdr?: number | string;
    hdpeGrade?: string;
    hdpePressureRating?: number | string;
    pvcType?: string;
    pvcPressureClass?: number | string;
    // Project-wide PVC joining-method preference. Drives the
    // PVC coupling consolidation: "solvent_cement" → slip couplings,
    // "rubber_ring" → RRJ couplings, "compression" → compression /
    // repair couplings, "threaded" / "flanged_adaptor" → no
    // couplings (different jointing pattern).
    pvcJoiningMethod?: string;
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
  // Total weld length per type in linear metres.
  welds?: Record<string, number>;
  // Number of welds per type (integer count), parallel to `welds`.
  weldCounts?: Record<string, number>;
  intAreaM2?: number;
  extAreaM2?: number;
}

// Weld key → DTO field name mapping. Used both for accumulation
// inside the consolidation loop and for the mapToDto translation.
const WELD_TYPES = [
  "Pipe Weld",
  "Flange Weld",
  "Mitre Weld",
  "Tee Weld",
  "Gusset Tee Weld",
  "Lat Weld 45+",
  "Lat Weld <45",
] as const;

// Merge new welds + counts onto an existing or new ConsolidatedItem.
// Returns the same record for chaining. Empty welds are skipped so
// items with no weld signal don't end up with a `welds: {}` blob.
const mergeWelds = (
  item: { welds?: Record<string, number>; weldCounts?: Record<string, number> },
  welds: Record<string, number>,
  weldCounts: Record<string, number>,
): void => {
  WELD_TYPES.forEach((type) => {
    const incomingLength = welds[type];
    const incomingCount = weldCounts[type];
    if (incomingLength != null && incomingLength > 0) {
      const existingWelds = item.welds;
      const existing = existingWelds ?? {};
      const rawExistingLength = existing[type];
      const existingLength = rawExistingLength == null ? 0 : rawExistingLength;
      item.welds = { ...existing, [type]: existingLength + incomingLength };
    }
    if (incomingCount != null && incomingCount > 0) {
      const existingWeldCounts = item.weldCounts;
      const existing = existingWeldCounts ?? {};
      const rawExistingCount = existing[type];
      const existingCount = rawExistingCount == null ? 0 : rawExistingCount;
      item.weldCounts = { ...existing, [type]: existingCount + incomingCount };
    }
  });
};

// Circumferential weld length per joint in metres.
const weldCircumferenceM = (odMm: number): number => (Math.PI * odMm) / 1000;

function flangeSpec(
  entry: any,
  globalSpecs?: ConsolidationInput["globalSpecs"],
  masterData?: ConsolidationInput["masterData"],
): { spec: string; standard: string; pressureClass: string; flangeTypeCode?: string } {
  const rawFlangeStandardId = entry.specs?.flangeStandardId;
  const flangeStandardId = rawFlangeStandardId || globalSpecs?.flangeStandardId;
  const rawFlangePressureClassId = entry.specs?.flangePressureClassId;
  const flangePressureClassId = rawFlangePressureClassId || globalSpecs?.flangePressureClassId;
  const flangeStandards = masterData?.flangeStandards;
  const pressureClasses = masterData?.pressureClasses;
  const rawCode = flangeStandards?.find((s) => s.id === flangeStandardId)?.code;
  const flangeStandard = flangeStandardId && flangeStandards ? rawCode || "" : "";
  const rawDesignation = pressureClasses?.find((p) => p.id === flangePressureClassId)?.designation;
  const rawPressureClassDesignation = globalSpecs?.pressureClassDesignation;
  const pressureClass =
    flangePressureClassId && pressureClasses
      ? rawDesignation || rawPressureClassDesignation || "PN16"
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
  // HDPE butt-fusion stub-ends — one per HDPE-pipe flange end. Paired
  // with the existing backing-flange consolidation so the supplier
  // sees them as their own priceable line items.
  const consolidatedHdpeStubs: Map<string, ConsolidatedItem> = new Map();

  // Detect whether an entry is HDPE so we can mirror each HDPE backing
  // flange into a stub-end line. materialType is the canonical field;
  // productType / description keywords fall back when older entries
  // didn't populate it.
  const isHdpeEntry = (entry: any): boolean => {
    const matType = entry?.materialType;
    if (matType === "hdpe") return true;
    const productType = entry?.specs?.productType;
    if (productType === "hdpe") return true;
    const rawDescription = entry?.description;
    const descriptionRaw = rawDescription || "";
    const description = descriptionRaw.toLowerCase();
    return /\b(hdpe|pe\s?100|pe\s?80)\b/.test(description);
  };

  const addHdpeStub = (
    nb: number,
    pressureClassLabel: string,
    sdrValue: number | string | undefined,
    flangeQty: number,
    entryItemNumber: number,
  ): void => {
    if (flangeQty <= 0) return;
    const sdrLabel = sdrValue ? `SDR${sdrValue}` : "";
    const sdrSuffix = sdrLabel ? ` ${sdrLabel}` : "";
    const pnSuffix = pressureClassLabel ? ` ${pressureClassLabel}` : "";
    const key = `HDPE_STUB_${nb}_${sdrLabel || "-"}_${pressureClassLabel || "-"}`;
    const existing = consolidatedHdpeStubs.get(key);
    if (existing) {
      existing.qty += flangeQty;
      existing.entries.push(entryItemNumber);
      return;
    }
    consolidatedHdpeStubs.set(key, {
      description: `${nb}OD HDPE PE100${sdrSuffix}${pnSuffix} Butt-Fusion Stub End`.trim(),
      qty: flangeQty,
      unit: "Each",
      weight: 0,
      entries: [entryItemNumber],
    });
  };

  // PVC stub-flange adapters — issue #288 Phase 5. Mirrors the HDPE
  // stub pattern: one stub-flange adapter per PVC pipe / bend /
  // fitting flange end. Each adapter pairs with a SANS 1123 backing
  // ring (which the existing consolidatedFlanges path already
  // counts). Less common than HDPE stubs because most PVC flanging
  // uses slip-on adapters directly — kept as its own section so
  // suppliers price them separately when needed.
  const consolidatedPvcStubs: Map<string, ConsolidatedItem> = new Map();

  const isPvcEntry = (entry: any): boolean => {
    const matType = entry?.materialType;
    if (matType === "pvc") return true;
    const productType = entry?.specs?.productType;
    if (productType === "pvc" || productType === "upvc") return true;
    const rawDescription = entry?.description;
    const description = (rawDescription || "").toLowerCase();
    return /\b(upvc|mpvc|pvc-?u|pvc-?m|pvc-?o|cpvc|pvc)\b/.test(description);
  };

  const addPvcStub = (
    nb: number,
    pressureClassLabel: string,
    pvcGradeLabel: string | undefined,
    flangeQty: number,
    entryItemNumber: number,
  ): void => {
    if (flangeQty <= 0) return;
    const gradeLabel = pvcGradeLabel || "uPVC";
    const pnSuffix = pressureClassLabel ? ` ${pressureClassLabel}` : "";
    const key = `PVC_STUB_${nb}_${gradeLabel}_${pressureClassLabel || "-"}`;
    const existing = consolidatedPvcStubs.get(key);
    if (existing) {
      existing.qty += flangeQty;
      existing.entries.push(entryItemNumber);
      return;
    }
    consolidatedPvcStubs.set(key, {
      description: `${nb}OD ${gradeLabel}${pnSuffix} Stub Flange Adapter`.trim(),
      qty: flangeQty,
      unit: "Each",
      weight: 0,
      entries: [entryItemNumber],
    });
  };

  // PVC pipe couplings — issue #288 Phase 5. Suppliers price slip
  // (solvent-weld), rubber-ring (RRJ), and compression (repair)
  // couplings as separate line items per (DN, joining method).
  // Joining method is taken from globalSpecs.pvcJoiningMethod
  // (project-wide setting) with a fallback to "solvent_cement".
  // Threaded and flanged-adapter joining methods don't produce
  // couplings (threaded uses fittings; flanged uses backing rings).
  const consolidatedPvcCouplings: Map<string, ConsolidatedItem> = new Map();

  const COUPLING_TYPE_LABEL: Record<string, string> = {
    solvent_cement: "Slip Coupling (Solvent-Weld)",
    rubber_ring: "RRJ Coupling (Rubber-Ring)",
    compression: "Compression / Repair Coupling",
  };
  const couplingTypeForJoiningMethod = (method: string | undefined): string | null => {
    if (!method) return "solvent_cement";
    if (method === "solvent_cement") return "solvent_cement";
    if (method === "rubber_ring") return "rubber_ring";
    if (method === "compression") return "compression";
    // threaded / flanged_adaptor / other — no coupling line item
    return null;
  };

  const addPvcCoupling = (
    nb: number,
    pressureClassLabel: string,
    pvcGradeLabel: string | undefined,
    couplingQty: number,
    entryItemNumber: number,
    joiningMethod: string | undefined,
  ): void => {
    if (couplingQty <= 0) return;
    const couplingType = couplingTypeForJoiningMethod(joiningMethod);
    if (!couplingType) return;
    const gradeLabel = pvcGradeLabel || "uPVC";
    const pnSuffix = pressureClassLabel ? ` ${pressureClassLabel}` : "";
    const rawCouplingLabel = COUPLING_TYPE_LABEL[couplingType];
    const couplingLabel = rawCouplingLabel || couplingType;
    const key = `PVC_COUPLING_${couplingType}_${nb}_${gradeLabel}_${pressureClassLabel || "-"}`;
    const existing = consolidatedPvcCouplings.get(key);
    if (existing) {
      existing.qty += couplingQty;
      existing.entries.push(entryItemNumber);
      return;
    }
    consolidatedPvcCouplings.set(key, {
      description: `${nb}OD ${gradeLabel}${pnSuffix} ${couplingLabel}`.trim(),
      qty: couplingQty,
      unit: "Each",
      weight: 0,
      entries: [entryItemNumber],
    });
  };
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
    const calculatedPipeCount = entry.calculation?.calculatedPipeCount;
    const qty = rawQuantityValue || calculatedPipeCount || 1;
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

      // ──── Bend row consolidation (Phase 0, issue #288) ────
      // Populate consolidatedBends with welds + areas so the
      // supplier portal sees the bend rows. Mirrors the BOQStep
      // render-time consolidation but lives at submit time too.
      const rawBendAngle = entry.specs?.bendAngle;
      const rawBendDegrees = entry.specs?.bendDegrees;
      const bendAngle = rawBendAngle || rawBendDegrees || 90;
      const rawBendType = entry.specs?.bendType;
      const bendTypeLabel = rawBendType || "1.5D";
      const rawBendScheduleNumber = entry.specs?.scheduleNumber;
      const bendSchedule = rawBendScheduleNumber || "";
      const rawBendMaterialType = entry.materialType;
      const bendMaterialType = rawBendMaterialType || "steel";
      const bendSteelSpecName = bendMaterialType === "steel" ? `${nb}` : "";
      const bendKey = `BEND_${bendMaterialType}_${nb}_${bendAngle}_${bendTypeLabel}_${bendSteelSpecName}_${bendSchedule}`;
      const rawBendCalcOd = entry.calculation?.outsideDiameterMm;
      const rawBendCalcWt = entry.calculation?.wallThicknessMm;
      const bendHdpeDims =
        bendMaterialType === "hdpe" && (!rawBendCalcOd || !rawBendCalcWt)
          ? resolveHdpeDims(nb, entry, globalSpecs?.hdpeSdr, globalSpecs?.hdpePressureRating)
          : null;
      const bendOd = rawBendCalcOd || (bendHdpeDims ? bendHdpeDims.od : nb);
      const bendWt = rawBendCalcWt || (bendHdpeDims ? bendHdpeDims.wt : 0);
      const rawBendSegments = entry.specs?.numberOfSegments;
      const bendSegments = rawBendSegments || 5;
      const bendMitreCount = Math.max(0, bendSegments - 1);
      const bendMitreLength = bendMitreCount * qty * weldCircumferenceM(bendOd);
      const bendFlangeWeldCount = flangeCount.main * qty;
      const bendFlangeWeldLength =
        flangeCount.main > 0 ? bendFlangeWeldCount * 2 * weldCircumferenceM(bendOd) : 0;
      const bendRadiusFactor = parseFloat(bendTypeLabel.replace(/[^\d.]/g, "")) || 1.5;
      const bendRadiusMm = nb * bendRadiusFactor;
      const bendArcLengthM = ((bendRadiusMm / 1000) * (bendAngle * Math.PI)) / 180;
      const rawBendTangents = entry.specs?.tangentLengths;
      const bendTangents: number[] = rawBendTangents || [];
      const rawBendTangent0 = bendTangents[0];
      const rawBendTangent1 = bendTangents[1];
      const bendTangent0 = rawBendTangent0 || 0;
      const bendTangent1 = rawBendTangent1 || 0;
      const bendTangentSumM = (bendTangent0 + bendTangent1) / 1000;
      const bendTotalLengthM = bendArcLengthM + bendTangentSumM;
      const bendExtAreaM2 = Math.PI * (bendOd / 1000) * bendTotalLengthM * qty;
      const bendIntAreaM2 = Math.PI * ((bendOd - 2 * bendWt) / 1000) * bendTotalLengthM * qty;
      const rawBendCalcWeight = entry.calculation?.totalWeight;
      const bendWeight = rawBendCalcWeight || fallbackBendWeight(entry, nb, globalSpecs?.hdpeSdr);
      const bendWelds: Record<string, number> = {};
      const bendWeldCounts: Record<string, number> = {};
      if (bendMitreLength > 0) {
        bendWelds["Mitre Weld"] = bendMitreLength;
        bendWeldCounts["Mitre Weld"] = bendMitreCount * qty;
      }
      if (bendFlangeWeldLength > 0) {
        bendWelds["Flange Weld"] = bendFlangeWeldLength;
        bendWeldCounts["Flange Weld"] = bendFlangeWeldCount * 2;
      }
      const bendMaterialLabel =
        bendMaterialType === "hdpe" ? "HDPE" : bendMaterialType === "pvc" ? "PVC" : "Steel";
      const existingBend = consolidatedBends.get(bendKey);
      if (existingBend) {
        existingBend.qty += qty;
        existingBend.weight += bendWeight * qty;
        existingBend.entries.push(itemNumber);
        mergeWelds(existingBend, bendWelds, bendWeldCounts);
        const existingBendIntArea = existingBend.intAreaM2;
        const existingBendExtArea = existingBend.extAreaM2;
        existingBend.intAreaM2 = (existingBendIntArea ?? 0) + bendIntAreaM2;
        existingBend.extAreaM2 = (existingBendExtArea ?? 0) + bendExtAreaM2;
      } else {
        const bendDescription =
          `${nb}NB ${bendAngle}° ${bendTypeLabel} Bend ${bendMaterialLabel}${bendSchedule ? ` Sch${bendSchedule.replace("Sch", "")}` : ""}`.trim();
        const bendRecord: ConsolidatedItem = {
          description: bendDescription,
          qty,
          unit: "Each",
          weight: bendWeight * qty,
          entries: [itemNumber],
        };
        mergeWelds(bendRecord, bendWelds, bendWeldCounts);
        if (bendIntAreaM2 > 0) bendRecord.intAreaM2 = bendIntAreaM2;
        if (bendExtAreaM2 > 0) bendRecord.extAreaM2 = bendExtAreaM2;
        consolidatedBends.set(bendKey, bendRecord);
      }
      // ──── end bend row consolidation ────

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

        if (isHdpeEntry(entry)) {
          addHdpeStub(nb, pressureClass, undefined, flangeQty, itemNumber);
        } else if (isPvcEntry(entry)) {
          addPvcStub(nb, pressureClass, globalSpecs?.pvcType, flangeQty, itemNumber);
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
      const rawNominalBoreMm = entry.specs?.nominalBoreMm;
      const nb = rawNominalDiameterMm || rawNominalBoreMm || 100;
      const rawBranchNominalDiameterMm = entry.specs?.branchNominalDiameterMm;
      const branchNb = rawBranchNominalDiameterMm || nb;
      const rawPipeEndConfiguration = entry.specs?.pipeEndConfiguration;
      const fittingEndConfig = rawPipeEndConfiguration || "PE";
      const flangeCount = getFlangeCountFromConfig(fittingEndConfig, "fitting");
      const flangeTypeName = getFlangeTypeName(fittingEndConfig);
      const isEqualBranch = branchNb === nb;
      const fittingBoltSets = boltSetCountPerFitting(fittingEndConfig, isEqualBranch);

      // ──── Fitting row consolidation (Phase 0, issue #288) ────
      // Tees / reducers / laterals — populate consolidatedFittings
      // with welds + areas. The DTO split between `tees` and
      // `reducers` is applied at mapToDto time by inspecting the key.
      const rawFittingType = entry.specs?.fittingType;
      const fittingType = rawFittingType || "TEE";
      const rawFittingScheduleNumber = entry.specs?.scheduleNumber;
      const fittingSchedule = rawFittingScheduleNumber || "";
      const fittingKey = `FITTING_${fittingType}_${nb}_${branchNb}_${fittingSchedule}`;
      const rawFittingMaterialType = entry.materialType;
      const fittingMaterialType = rawFittingMaterialType || "steel";
      const rawFittingCalcOd = entry.calculation?.outsideDiameterMm;
      const rawFittingCalcWt = entry.calculation?.wallThicknessMm;
      const fittingHdpeDims =
        fittingMaterialType === "hdpe" && (!rawFittingCalcOd || !rawFittingCalcWt)
          ? resolveHdpeDims(nb, entry, globalSpecs?.hdpeSdr, globalSpecs?.hdpePressureRating)
          : null;
      const fittingOd = rawFittingCalcOd || (fittingHdpeDims ? fittingHdpeDims.od : nb);
      const fittingWt = rawFittingCalcWt || (fittingHdpeDims ? fittingHdpeDims.wt : 0);
      const rawFittingBranchCalcOd = entry.calculation?.branchOutsideDiameterMm;
      const rawFittingBranchCalcWt = entry.calculation?.branchWallThicknessMm;
      const fittingHdpeBranchDims =
        fittingMaterialType === "hdpe" && (!rawFittingBranchCalcOd || !rawFittingBranchCalcWt)
          ? resolveHdpeDims(branchNb, entry, globalSpecs?.hdpeSdr, globalSpecs?.hdpePressureRating)
          : null;
      const fittingBranchOd =
        rawFittingBranchCalcOd || (fittingHdpeBranchDims ? fittingHdpeBranchDims.od : fittingOd);
      const fittingBranchWt =
        rawFittingBranchCalcWt || (fittingHdpeBranchDims ? fittingHdpeBranchDims.wt : fittingWt);
      const fittingTeeWeldCount = qty;
      const fittingTeeWeldLength = fittingTeeWeldCount * weldCircumferenceM(fittingOd);
      const fittingFlangeWeldCountMain = flangeCount.main * qty;
      const fittingFlangeWeldLengthMain =
        flangeCount.main > 0 ? fittingFlangeWeldCountMain * 2 * weldCircumferenceM(fittingOd) : 0;
      const fittingFlangeWeldCountBranch = flangeCount.branch * qty;
      const fittingFlangeWeldLengthBranch =
        flangeCount.branch > 0
          ? fittingFlangeWeldCountBranch * 2 * weldCircumferenceM(fittingBranchOd)
          : 0;
      const fittingFlangeWeldLength = fittingFlangeWeldLengthMain + fittingFlangeWeldLengthBranch;
      const fittingFlangeWeldCount =
        fittingFlangeWeldCountMain * 2 + fittingFlangeWeldCountBranch * 2;
      const isLateral = ["LATERAL", "REDUCING_LATERAL", "Y_PIECE"].includes(fittingType);
      const isGussetTee = ["GUSSET_TEE", "UNEQUAL_GUSSET_TEE", "GUSSET_REDUCING_TEE"].includes(
        fittingType,
      );
      const angleRange = entry.specs?.angleRange as string | undefined;
      const isLateralHighAngle = angleRange === "60-90" || angleRange === "45-59";
      const isReducer = fittingType.includes("REDUCER") && !fittingType.includes("TEE");
      const fittingWeldType: string = isLateral
        ? isLateralHighAngle
          ? "Lat Weld 45+"
          : "Lat Weld <45"
        : isGussetTee
          ? "Gusset Tee Weld"
          : "Tee Weld";
      const rawFittingLengthA = entry.specs?.pipeLengthAMm;
      const rawFittingLengthB = entry.specs?.pipeLengthBMm;
      const rawFittingTeeHeight = entry.specs?.teeHeightMm;
      const fittingRunLengthM = ((rawFittingLengthA || 0) + (rawFittingLengthB || 0)) / 1000;
      const fittingBranchLengthM = (rawFittingTeeHeight || branchNb * 2) / 1000;
      const fittingOdM = fittingOd / 1000;
      const fittingIdM = (fittingOd - 2 * fittingWt) / 1000;
      const fittingBranchOdM = fittingBranchOd / 1000;
      const fittingBranchIdM = (fittingBranchOd - 2 * fittingBranchWt) / 1000;
      const fittingExtAreaM2 =
        qty *
        (Math.PI * fittingOdM * fittingRunLengthM +
          Math.PI * fittingBranchOdM * fittingBranchLengthM);
      const fittingIntAreaM2 =
        qty *
        (Math.PI * fittingIdM * fittingRunLengthM +
          Math.PI * fittingBranchIdM * fittingBranchLengthM);
      const rawFittingCalcWeight = entry.calculation?.totalWeight;
      const fittingWeight =
        rawFittingCalcWeight || fallbackFittingWeight(entry, nb, branchNb, globalSpecs?.hdpeSdr);
      const fittingWelds: Record<string, number> = {};
      const fittingWeldCounts: Record<string, number> = {};
      // Reducers have no tee weld — just the body, joined to pipe
      // by the pipe-side weld (which the upstream pipe row counts).
      if (!isReducer && fittingTeeWeldLength > 0) {
        fittingWelds[fittingWeldType] = fittingTeeWeldLength;
        fittingWeldCounts[fittingWeldType] = fittingTeeWeldCount;
      }
      if (fittingFlangeWeldLength > 0) {
        fittingWelds["Flange Weld"] = fittingFlangeWeldLength;
        fittingWeldCounts["Flange Weld"] = fittingFlangeWeldCount;
      }
      const fittingMaterialLabel =
        fittingMaterialType === "hdpe" ? "HDPE" : fittingMaterialType === "pvc" ? "PVC" : "Steel";
      const fittingDisplayType = fittingType
        .replace(/_/g, " ")
        .toLowerCase()
        .split(" ")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      const fittingDescription =
        `${nb}NB ${fittingDisplayType} ${fittingMaterialLabel}${fittingSchedule ? ` Sch${fittingSchedule.replace("Sch", "")}` : ""}`.trim();
      const existingFitting = consolidatedFittings.get(fittingKey);
      if (existingFitting) {
        existingFitting.qty += qty;
        existingFitting.weight += fittingWeight * qty;
        existingFitting.entries.push(itemNumber);
        mergeWelds(existingFitting, fittingWelds, fittingWeldCounts);
        const existingFittingIntArea = existingFitting.intAreaM2;
        const existingFittingExtArea = existingFitting.extAreaM2;
        existingFitting.intAreaM2 = (existingFittingIntArea ?? 0) + fittingIntAreaM2;
        existingFitting.extAreaM2 = (existingFittingExtArea ?? 0) + fittingExtAreaM2;
      } else {
        const fittingRecord: ConsolidatedItem = {
          description: fittingDescription,
          qty,
          unit: "Each",
          weight: fittingWeight * qty,
          entries: [itemNumber],
        };
        mergeWelds(fittingRecord, fittingWelds, fittingWeldCounts);
        if (fittingIntAreaM2 > 0) fittingRecord.intAreaM2 = fittingIntAreaM2;
        if (fittingExtAreaM2 > 0) fittingRecord.extAreaM2 = fittingExtAreaM2;
        consolidatedFittings.set(fittingKey, fittingRecord);
      }
      // ──── end fitting row consolidation ────

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

        if (isHdpeEntry(entry)) {
          addHdpeStub(nb, pressureClass, undefined, flangeQty, itemNumber);
        } else if (isPvcEntry(entry)) {
          addPvcStub(nb, pressureClass, globalSpecs?.pvcType, flangeQty, itemNumber);
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

        if (isHdpeEntry(entry)) {
          addHdpeStub(branchNb, pressureClass, undefined, branchFlangeQty, itemNumber);
        } else if (isPvcEntry(entry)) {
          addPvcStub(branchNb, pressureClass, globalSpecs?.pvcType, branchFlangeQty, itemNumber);
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

      // ──── Straight-pipe row consolidation (Phase 0, issue #288) ────
      // Populate consolidatedPipes with welds + areas. Metres-quoted
      // BOQs (Nix imports) get converted to piece counts using the
      // individualPipeLength so the supplier sees real pipe counts.
      const rawPipeSchedule = entry.specs?.scheduleNumber;
      const pipeSchedule = rawPipeSchedule || "";
      const rawIndividualPipeLength = entry.specs?.individualPipeLength;
      const pipeLength = rawIndividualPipeLength || DEFAULT_PIPE_LENGTH_M;
      const rawQuantityType = entry.specs?.quantityType;
      const piecesFromMetres =
        rawQuantityType === "total_length" && pipeLength > 0 ? Math.ceil(qty / pipeLength) : qty;
      const pipeRowQty = rawCalculatedPipeCount || piecesFromMetres;
      const rawPipeMaterialType = entry.materialType;
      const pipeMaterialType = rawPipeMaterialType || "steel";
      const pipeVariant = detectPipeVariant(entry.description);
      const pipeVariantKey = pipeVariant ?? "";
      const pipeKey = `PIPE_${pipeMaterialType}_${nb}_${pipeSchedule}_${pipeLength}_${pipeVariantKey}`;
      const rawPipeCalcOd = entry.calculation?.outsideDiameterMm;
      const rawPipeCalcWt = entry.calculation?.wallThicknessMm;
      const pipeHdpeDims =
        pipeMaterialType === "hdpe" && (!rawPipeCalcOd || !rawPipeCalcWt)
          ? resolveHdpeDims(nb, entry, globalSpecs?.hdpeSdr, globalSpecs?.hdpePressureRating)
          : null;
      const pipeOd = rawPipeCalcOd || (pipeHdpeDims ? pipeHdpeDims.od : nb);
      const pipeWt = rawPipeCalcWt || (pipeHdpeDims ? pipeHdpeDims.wt : 0);
      const rawPipeWeldsPerUnit = entry.calculation?.pipeWeldsPerUnit;
      // HDPE pipes default to 1 butt-fusion joint per piece (the
      // weld between this pipe and the next run-of-pipe item); steel
      // / PVC carry whatever the steel calc service populated.
      const pipeWeldCount = rawPipeWeldsPerUnit || (pipeMaterialType === "hdpe" ? pipeRowQty : 0);
      const pipeWeldLength = pipeWeldCount * weldCircumferenceM(pipeOd);
      const rawTotalFlangeWeldLength = entry.calculation?.totalFlangeWeldLength;
      const pipeFlangeWeldLength = rawTotalFlangeWeldLength || 0;
      const pipeFlangeWeldCount = flangeCount.main * pipeRowQty * 2;
      const rawCalculatedTotalLength = entry.calculation?.calculatedTotalLength;
      const pipeTotalLengthM = rawCalculatedTotalLength || pipeLength * pipeRowQty;
      const pipeExtAreaM2 = Math.PI * (pipeOd / 1000) * pipeTotalLengthM;
      const pipeIntAreaM2 = Math.PI * ((pipeOd - 2 * pipeWt) / 1000) * pipeTotalLengthM;
      const pipeWeight = fallbackPipeWeight(
        entry,
        nb,
        pipeLength,
        pipeRowQty,
        globalSpecs?.hdpeSdr,
      );
      const pipeWelds: Record<string, number> = {};
      const pipeWeldCounts: Record<string, number> = {};
      if (pipeWeldLength > 0) {
        pipeWelds["Pipe Weld"] = pipeWeldLength;
        pipeWeldCounts["Pipe Weld"] = pipeWeldCount;
      }
      if (pipeFlangeWeldLength > 0) {
        pipeWelds["Flange Weld"] = pipeFlangeWeldLength;
        pipeWeldCounts["Flange Weld"] = pipeFlangeWeldCount;
      }
      const pipeMaterialLabel =
        pipeMaterialType === "hdpe" ? "HDPE" : pipeMaterialType === "pvc" ? "PVC" : "Steel";
      const pipeVariantPrefixLabel = pipeVariant
        ? `${pipeVariant.charAt(0).toUpperCase()}${pipeVariant.slice(1)} `
        : "";
      const pipeDescription =
        `${pipeVariantPrefixLabel}${nb}${pipeMaterialType === "steel" ? "NB" : "OD"} ${pipeMaterialLabel}${pipeSchedule ? ` Sch${pipeSchedule.replace("Sch", "")}` : ""} Pipe x${pipeLength}m`.trim();
      const existingPipe = consolidatedPipes.get(pipeKey);
      if (existingPipe) {
        existingPipe.qty += pipeRowQty;
        existingPipe.weight += pipeWeight;
        existingPipe.entries.push(itemNumber);
        mergeWelds(existingPipe, pipeWelds, pipeWeldCounts);
        const existingPipeIntArea = existingPipe.intAreaM2;
        const existingPipeExtArea = existingPipe.extAreaM2;
        existingPipe.intAreaM2 = (existingPipeIntArea ?? 0) + pipeIntAreaM2;
        existingPipe.extAreaM2 = (existingPipeExtArea ?? 0) + pipeExtAreaM2;
      } else {
        const pipeRecord: ConsolidatedItem = {
          description: pipeDescription,
          qty: pipeRowQty,
          unit: "Each",
          weight: pipeWeight,
          entries: [itemNumber],
        };
        mergeWelds(pipeRecord, pipeWelds, pipeWeldCounts);
        if (pipeIntAreaM2 > 0) pipeRecord.intAreaM2 = pipeIntAreaM2;
        if (pipeExtAreaM2 > 0) pipeRecord.extAreaM2 = pipeExtAreaM2;
        consolidatedPipes.set(pipeKey, pipeRecord);
      }

      // PVC pipe couplings — issue #288 Phase 5. One coupling per
      // inter-pipe joint when the pipe needs to be field-joined
      // (plain ends with solvent / RRJ / compression jointing).
      // Skip FBE pipes entirely — they connect end-to-end via
      // backing-ring + gasket and the existing consolidatedFlanges
      // / pvcStubs paths already count those. For N pipes in a
      // continuous run there are (N-1) inter-pipe joints, so the
      // coupling count is `pipeRowQty - 1`.
      if (pipeMaterialType === "pvc") {
        const rawPvcJoiningMethod = globalSpecs?.pvcJoiningMethod;
        const joiningMethod = rawPvcJoiningMethod || "solvent_cement";
        const isFlangedBothEnds = pipeEndConfig === "FBE";
        const couplingQty = Math.max(0, pipeRowQty - 1);
        if (!isFlangedBothEnds && couplingQty > 0) {
          const rawPvcClass = globalSpecs?.pvcPressureClass;
          const pvcPressureClassLabel = rawPvcClass != null ? `Class ${rawPvcClass}` : "";
          addPvcCoupling(
            nb,
            pvcPressureClassLabel,
            globalSpecs?.pvcType,
            couplingQty,
            itemNumber,
            joiningMethod,
          );
        }
      }
      // ──── end straight-pipe row consolidation ────

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

        if (isHdpeEntry(entry)) {
          addHdpeStub(nb, pressureClass, undefined, flangeQty, itemNumber);
        } else if (isPvcEntry(entry)) {
          addPvcStub(nb, pressureClass, globalSpecs?.pvcType, flangeQty, itemNumber);
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

        weldCounts: item.weldCounts
          ? {
              pipeWeld: item.weldCounts["Pipe Weld"],
              flangeWeld: item.weldCounts["Flange Weld"],
              mitreWeld: item.weldCounts["Mitre Weld"],
              teeWeld: item.weldCounts["Tee Weld"],
              gussetTeeWeld: item.weldCounts["Gusset Tee Weld"],
              latWeld45Plus: item.weldCounts["Lat Weld 45+"],
              latWeldUnder45: item.weldCounts["Lat Weld <45"],
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

  // Split fittings into tees vs reducers for the DTO. Suppliers
  // price them differently (reducer = single-port body, tee = three-
  // port body with branch weld), so the DTO carries separate
  // arrays. Tees include equal / short / gusset / lateral families;
  // reducers include concentric + eccentric.
  const fittingsArray = Array.from(consolidatedFittings.entries());
  const teeEntries = new Map(fittingsArray.filter(([k]) => !k.includes("REDUCER")));
  const reducerEntries = new Map(fittingsArray.filter(([k]) => k.includes("REDUCER")));

  return {
    straightPipes: consolidatedPipes.size > 0 ? mapToDto(consolidatedPipes) : undefined,
    bends: consolidatedBends.size > 0 ? mapToDto(consolidatedBends) : undefined,
    tees: teeEntries.size > 0 ? mapToDto(teeEntries) : undefined,
    reducers: reducerEntries.size > 0 ? mapToDto(reducerEntries) : undefined,
    flanges: consolidatedFlanges.size > 0 ? mapToDto(consolidatedFlanges) : undefined,
    blankFlanges:
      consolidatedBlankFlanges.size > 0 ? mapToDto(consolidatedBlankFlanges) : undefined,
    bnwSets: consolidatedBnwSets.size > 0 ? mapToDto(consolidatedBnwSets) : undefined,
    gaskets: consolidatedGaskets.size > 0 ? mapToDto(consolidatedGaskets) : undefined,
    hdpeStubs: consolidatedHdpeStubs.size > 0 ? mapToDto(consolidatedHdpeStubs) : undefined,
    pvcStubs: consolidatedPvcStubs.size > 0 ? mapToDto(consolidatedPvcStubs) : undefined,
    pvcCouplings:
      consolidatedPvcCouplings.size > 0 ? mapToDto(consolidatedPvcCouplings) : undefined,
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
