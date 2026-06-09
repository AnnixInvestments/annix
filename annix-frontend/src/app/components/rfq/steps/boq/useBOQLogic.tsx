"use client";

import {
  hdpeEndCapLength,
  hdpeReducerLength,
  hdpeTeeDimensions,
  inferReducerBranchDn,
  lateralDimensions,
  sans1123StubAssemblyDescription,
} from "@annix/product-data/hdpe";
import { FLANGE_OD } from "@annix/product-data/pipe";
import { isArray, isNumber, isString, keys, values } from "es-toolkit/compat";
import React, { useCallback, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useOptionalAdminAuth } from "@/app/context/AdminAuthContext";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import { DEFAULT_PIPE_LENGTH_M } from "@/app/lib/config/rfq";
import {
  boltSetCountPerBend,
  boltSetCountPerFitting,
  boltSetCountPerPipe,
} from "@/app/lib/config/rfq/pipeEndOptions";
import { nowISO } from "@/app/lib/datetime";
import {
  blankFlangeSurfaceArea,
  bnwSetInfo,
  flangeWeight,
  gasketWeightLookup,
  useAllBnwSetWeights,
  useAllFlangeTypeWeights,
  useAllGasketWeights,
} from "@/app/lib/query/hooks";
import { detectClarificationRequirements } from "@/app/lib/rfq/preQuoteRequirements";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import {
  fallbackBendWeight,
  fallbackFittingWeight,
  fallbackMiscWeight,
  fallbackPipeWeight,
  resolveHdpeDims,
  resolveHdpePn,
  resolveSteelPipeDims,
} from "./calc";
import { pipeRowDescription } from "./description";
import {
  bendCenterToFaceMm,
  consolidatedToRows,
  detectPipeVariant,
  flangeConfigSuffix,
  formatQty,
  formatWeight,
  getFlangeCountFromConfig,
  getFlangeTypeName,
  materialOfEntry,
  pipeVariantPrefix,
  safeFilename,
  triggerDownload,
} from "./helpers";
import { getFlangeSpec, getSteelSpecName } from "./spec";
import { type PlatePart, tankPlateTakeoff, verifyTankMass, weldTakeoff } from "./tankTakeoff";
import type { ConsolidatedItem, ExportableSubsection, ExportFormat, MaterialKey } from "./types";

export interface BOQStepProps {
  onPrevStep?: () => void;
  onSubmit?: () => void;
  onResubmit?: () => void;
  onResendBoq?: () => void;
  isEditing?: boolean;
  clarificationsSkipped?: boolean;
}

export function useBOQLogic(props: BOQStepProps) {
  const { onPrevStep, onSubmit, onResubmit, onResendBoq, isEditing, clarificationsSkipped } = props;
  const rfqData = useRfqWizardStore((s) => s.rfqData);
  const masterData = useRfqWizardStore((s) => s.masterData);
  const loading = useRfqWizardStore((s) => s.isSubmitting);
  const pendingDocuments = useRfqWizardStore((s) => s.pendingDocuments);
  const pendingTenderDocuments = useRfqWizardStore((s) => s.pendingTenderDocuments);
  const { data: allWeights = [] } = useAllFlangeTypeWeights();
  const { data: allBnwSets = [] } = useAllBnwSetWeights();
  const { data: allGaskets = [] } = useAllGasketWeights();
  const allEntries: any[] = rfqData.items.length > 0 ? rfqData.items : rfqData.straightPipeEntries;
  // Detection runs at render time off the live items + uploaded
  // filenames. The PreQuoteClarificationsStep does the same compute
  // but the BOQ step doing it independently means jumping straight
  // to BOQ via the step pill still applies the omissions — no need
  // to threaad omittedItemIds through props.
  const omittedItemIds = useMemo(() => {
    const pendingDocsArray = pendingDocuments || [];
    const pendingTenderArray = pendingTenderDocuments || [];
    const filenames = [...pendingDocsArray, ...pendingTenderArray].map((d) => d.file.name);
    const requirements = detectClarificationRequirements(
      allEntries,
      filenames,
      rfqData.globalSpecs,
    );
    return requirements.flaggedItemIds;
  }, [allEntries, pendingDocuments, pendingTenderDocuments, rfqData.globalSpecs]);

  // Skip flagged rows from consolidation — they're listed in the
  // "Items omitted — pending drawings" panel above the BOQ tables
  // instead so the customer sees what's missing without polluting
  // the supplier-bound output.
  const entries: any[] = allEntries.filter((entry) => !omittedItemIds.has(entry.id));
  const omittedEntries: any[] = allEntries.filter((entry) => omittedItemIds.has(entry.id));
  // Admin-only traceability: map each clientItemNumber back to the
  // source sheet + row the item was extracted from so the BOQ
  // tables can show a "Source" column. Manual entries (no Nix
  // extraction) won't appear in this map and render as "—".
  // Lookup keyed by entry.id (unique per item) rather than
  // clientItemNumber (which collides across sheets — the same "a.1"
  // can appear on three different enquiry tabs and resolve to three
  // different rows). The consolidation pipeline tracks entryIds in
  // parallel to entries so the render can pull each source out
  // independently.
  //
  // Built in three passes so legacy entries (extracted before v1.5.32
  // when the sheet name was first written) inherit the sheet from
  // any newer entry that points to the same row. Without that
  // backfill, a re-extracted RFQ that left old items in the wizard
  // state shows duplicate labels: "R6, HDPE ENQ 1!R6" for the same
  // source row.
  const sourceLookup = useMemo(() => {
    const raw = new Map<string, { row: number; sheet?: string }>();
    allEntries.forEach((entry) => {
      const entryId = entry.id;
      if (!entryId) return;
      const sourceLocation = entry.sourceLocation;
      if (sourceLocation) {
        raw.set(entryId, { row: sourceLocation.rowNumber, sheet: sourceLocation.sheetName });
        return;
      }
      const rawNotes = entry.notes;
      if (!isString(rawNotes)) return;
      const match = rawNotes.match(/Extracted by Nix from(?: Sheet '([^']+)')? Row (\d+)/);
      const matchedSheet = match?.[1];
      const matchedRow = match?.[2];
      if (!matchedRow) return;
      raw.set(entryId, { row: Number.parseInt(matchedRow, 10), sheet: matchedSheet });
    });
    const sheetByRow = new Map<number, string>();
    raw.forEach(({ row, sheet }) => {
      if (sheet && !sheetByRow.has(row)) {
        sheetByRow.set(row, sheet);
      }
    });
    const lookup = new Map<string, string>();
    raw.forEach(({ row, sheet }, entryId) => {
      const finalSheet = sheet ?? sheetByRow.get(row);
      const sheetPrefix = finalSheet ? `${finalSheet}!` : "";
      lookup.set(entryId, `${sheetPrefix}R${row}`);
    });
    return lookup;
  }, [allEntries]);
  // Render the Source column whenever at least one entry was
  // extracted from a tender document — covers Nix uploads (admin or
  // customer) and hides the column for purely manual entry where the
  // column would just show "—" for every row.
  const hasAnySourceLocations = sourceLookup.size > 0;
  const globalSpecs = rfqData.globalSpecs;
  const rawRequiredProducts = rfqData.requiredProducts;
  const requiredProducts = rawRequiredProducts || [];
  // Authentication status for unregistered customer restrictions
  // Don't apply restrictions while auth is still loading to prevent flash of restricted state
  const { isAuthenticated: isCustomerAuthenticated, isLoading: isCustomerAuthLoading } =
    useOptionalCustomerAuth();
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminAuthLoading } =
    useOptionalAdminAuth();
  const isAuthLoading = isCustomerAuthLoading || isAdminAuthLoading;
  const isUnregisteredCustomer =
    !isAuthLoading && !isCustomerAuthenticated && !isAdminAuthenticated;

  // Restriction popup state
  type RestrictionPopupType = "export";
  const [restrictionPopup, setRestrictionPopup] = useState<{
    type: RestrictionPopupType;
    x: number;
    y: number;
  } | null>(null);

  const showRestrictionPopup = useCallback(
    (type: RestrictionPopupType) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setRestrictionPopup({ type, x: e.clientX, y: e.clientY });
    },
    [],
  );
  // Lookups passed to the extracted spec helpers — keeps BOQStep
  // call sites concise and the helpers honest about their deps.
  const flangeSpecLookup = {
    globalFlangeStandardId: globalSpecs?.flangeStandardId,
    globalFlangePressureClassId: globalSpecs?.flangePressureClassId,
    flangeStandards: masterData?.flangeStandards,
    pressureClasses: masterData?.pressureClasses,
  };
  const steelSpecLookup = {
    globalSteelSpecificationId: globalSpecs?.steelSpecificationId,
    steelSpecs: masterData?.steelSpecs,
  };
  const globalHdpeSdr = globalSpecs?.hdpeSdr;
  const globalHdpePressureRating = globalSpecs?.hdpePressureRating;

  // ======================
  // PIPE / WEIGHT HELPERS
  // ======================
  // Extracted to boq/calc.ts and boq/description.ts. Closure-bound
  // values (globalSpecs.hdpeSdr / hdpePressureRating) are now passed
  // explicitly so the helpers are unit-testable.

  // ======================
  // CONSOLIDATION LOGIC
  // ======================

  // Maps to store consolidated items. The legacy single-map
  // architecture is kept and partitioned by material at render time
  // so each consolidated row keeps its qty/weight accumulation logic
  // intact.
  const consolidatedPipes: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBends: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFittings: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFlanges: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBnwSets: Map<string, ConsolidatedItem> = new Map();
  const consolidatedGaskets: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBlankFlanges: Map<string, ConsolidatedItem> = new Map();
  // Standalone groups not partitioned by material — valves get their
  // own table because a steel-bodied gate valve and an HDPE-stub-end
  // pinch valve are sourced from the same supplier category. Same
  // for fasteners (bolts/nuts/gaskets ship as a bundle regardless of
  // pipeline material). Unidentified holds anything where Nix could
  // not infer a productType.
  const consolidatedValves: Map<string, ConsolidatedItem> = new Map();
  const consolidatedTanks: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFasteners: Map<string, ConsolidatedItem> = new Map();
  const consolidatedUnidentified: Map<string, ConsolidatedItem> = new Map();
  const consolidatedHdpeOther: Map<string, ConsolidatedItem> = new Map();
  const consolidatedSteelOther: Map<string, ConsolidatedItem> = new Map();
  const consolidatedPvcOther: Map<string, ConsolidatedItem> = new Map();
  // HDPE butt-fusion stub-end adapters — one per HDPE flange end.
  // Populated alongside the backing-flange consolidation so the
  // customer sees them as their own priceable line items, matching
  // what boqConsolidation.ts sends to the supplier (issue #288).
  const consolidatedHdpeStubs: Map<string, ConsolidatedItem> = new Map();

  const addHdpeStubItem = (
    nb: number,
    pressureClassLabel: string,
    sdrValue: number | string | undefined,
    flangeQty: number,
    itemNumberArg: string,
    entryId: string,
  ): void => {
    if (flangeQty <= 0) return;
    const sdrLabel = sdrValue ? `SDR${sdrValue}` : "";
    const sdrSuffix = sdrLabel ? ` ${sdrLabel}` : "";
    const pnSuffix = pressureClassLabel ? ` ${pressureClassLabel}` : "";
    const key = `HDPE_STUB_${nb}_${sdrLabel || "-"}_${pressureClassLabel || "-"}`;
    const existing = consolidatedHdpeStubs.get(key);
    if (existing) {
      existing.qty += flangeQty;
      existing.entries.push(itemNumberArg);
      existing.entryIds.push(entryId);
      return;
    }
    consolidatedHdpeStubs.set(key, {
      description: `${nb}OD HDPE PE100${sdrSuffix}${pnSuffix} Butt-Fusion Stub End`.trim(),
      qty: flangeQty,
      unit: "Each",
      weight: 0,
      entries: [itemNumberArg],
      entryIds: [entryId],
      material: "hdpe",
    });
  };

  // PVC stub-flange adapter (the PVC analog of the HDPE stub-end).
  // One per PVC-pipe flange end. Less common than HDPE — most PVC
  // flanging is slip-on + backing ring directly — but consolidated
  // separately so suppliers price the adapter as its own item.
  const consolidatedPvcStubs: Map<string, ConsolidatedItem> = new Map();

  const addPvcStubItem = (
    nb: number,
    pressureClassLabel: string,
    pvcGradeLabel: string | undefined,
    flangeQty: number,
    itemNumberArg: string,
    entryId: string,
  ): void => {
    if (flangeQty <= 0) return;
    const gradeLabel = pvcGradeLabel || "uPVC";
    const pnSuffix = pressureClassLabel ? ` ${pressureClassLabel}` : "";
    const key = `PVC_STUB_${nb}_${gradeLabel}_${pressureClassLabel || "-"}`;
    const existing = consolidatedPvcStubs.get(key);
    if (existing) {
      existing.qty += flangeQty;
      existing.entries.push(itemNumberArg);
      existing.entryIds.push(entryId);
      return;
    }
    consolidatedPvcStubs.set(key, {
      description: `${nb}OD ${gradeLabel}${pnSuffix} Stub Flange Adapter`.trim(),
      qty: flangeQty,
      unit: "Each",
      weight: 0,
      entries: [itemNumberArg],
      entryIds: [entryId],
      material: "pvc",
    });
  };

  // Defense-in-depth reclassifier for legacy drafts that came through
  // Nix BEFORE the consumable-regex fix landed. Those drafts have
  // steel pipe rows tagged itemType="misc" because their coating spec
  // mentioned "Carboline" (a brand name) and the old regex matched it.
  // Here we sniff the description for structural keywords and rebuild
  // a properly-typed entry in memory so the structured branches below
  // process it — putting it in the right Steel Pipes / Bends /
  // Fittings BOQ section instead of "Steel Other". No DB mutation.
  const reclassifyMiscPipeRow = (orig: any): any => {
    if (orig.itemType !== "misc") return orig;
    const rawOrigSpecs = orig.specs;
    const specs = rawOrigSpecs || {};
    if (specs.productType !== "steel") return orig;
    const rawOrigDescription = orig.description;
    const description = rawOrigDescription || "";
    if (!description) return orig;

    // Parse DN out of "DN N" or "DN N mild steel" etc. Same regex
    // shape as the misc-bucket DN parser further down.
    const dnPrefixMatch = description.match(/(?:DN|OD)\s*(\d{2,4})/i);
    const dnDiameterMatch = description.match(/(\d{2,4})\s*mm\s*(?:diameter|dia\.?|Ø)/i);
    const dn = dnPrefixMatch
      ? Number(dnPrefixMatch[1])
      : dnDiameterMatch
        ? Number(dnDiameterMatch[1])
        : null;
    if (!dn || !Number.isFinite(dn)) return orig;

    const wtMatch = description.match(/(\d+(?:\.\d+)?)\s*mm\s*wall\s*thickness/i);
    const wallThicknessMm = wtMatch ? Number(wtMatch[1]) : undefined;

    const lower = description.toLowerCase();
    const isLateral = /\b\d+\s*deg(?:ree)?s?\s*lateral\b|\blaterals?\b/.test(lower);
    const isBlankFlange = /\bblank\s*flange\b/.test(lower);
    const isReducer = /\breducers?\b/.test(lower);
    const isTee = /\b(t[-\s]?piece|tees?|sweep\s*t)\b/.test(lower);
    const isBend = /\b(\d+\s*deg(?:ree)?s?\s*bend|long\s*radius|sweep\s*bend|elbow)\b/.test(lower);
    const isSpool = /\bspools?\b/.test(lower);
    const isStraightPipe =
      /\bstraight\s*pipes?\b|\bpipe\s*spools?\b|\bstraight\s*spools?\b/.test(lower) ||
      (/\bmild\s*steel\s*pipes?\b/.test(lower) &&
        !isBend &&
        !isTee &&
        !isReducer &&
        !isLateral &&
        !isBlankFlange);

    // Hoist spec field accesses to plain locals before the OR
    // fallbacks — keeps the SWC-safety rule happy in dev builds.
    const rawScheduleNumber = specs.scheduleNumber;
    const rawScheduleType = specs.scheduleType;
    const rawQuantityType = specs.quantityType;
    const rawQuantityValue = specs.quantityValue;
    const rawIndividualPipeLength = specs.individualPipeLength;
    const rawUnit = specs.unit;

    const baseSpecsForFitting = {
      ...specs,
      nominalDiameterMm: dn,
      wallThicknessMm,
      scheduleNumber: rawScheduleNumber || "",
      quantityType: rawQuantityType || "number_of_items",
      quantityValue: rawQuantityValue || 1,
      fittingStandard: "SABS719",
    };

    if (isLateral) {
      return {
        ...orig,
        itemType: "fitting",
        materialType: "steel",
        specs: { ...baseSpecsForFitting, fittingType: "SABS719_LATERAL" },
      };
    }
    if (isReducer) {
      return {
        ...orig,
        itemType: "fitting",
        materialType: "steel",
        specs: { ...baseSpecsForFitting, fittingType: "CON_REDUCER" },
      };
    }
    if (isTee) {
      return {
        ...orig,
        itemType: "fitting",
        materialType: "steel",
        specs: { ...baseSpecsForFitting, fittingType: "SWEEP_TEE" },
      };
    }
    if (isBlankFlange) {
      return {
        ...orig,
        itemType: "fitting",
        materialType: "steel",
        specs: { ...baseSpecsForFitting, fittingType: "EQUAL_TEE" },
      };
    }
    if (isBend) {
      const angleMatch = description.match(/(\d+(?:\.\d+)?)\s*deg(?:ree)?s?/i);
      const bendDegrees = angleMatch ? Number(angleMatch[1]) : 90;
      const radiusMatch = description.match(/(\d+(?:\.\d+)?)\s*[xX]\s*D\b/);
      const bendType = radiusMatch ? `${radiusMatch[1]}D` : "3D";
      return {
        ...orig,
        itemType: "bend",
        materialType: "steel",
        specs: {
          ...specs,
          nominalBoreMm: dn,
          wallThicknessMm,
          bendDegrees,
          bendType,
          scheduleNumber: rawScheduleNumber || "",
          quantityType: rawQuantityType || "number_of_items",
          quantityValue: rawQuantityValue || 1,
        },
      };
    }
    if (isStraightPipe || isSpool) {
      const unitLower = isString(rawUnit) ? rawUnit.toLowerCase() : "";
      const unitIsMetres = /^(m|lm|metres?|meters?)$/.test(unitLower);
      const explicitLengthM = description.match(
        /(\d+(?:\.\d+)?)\s*m(?:etres?)?\s+(?:pipe\s*)?(?:length|long)\b/i,
      );
      const explicitLengthMm = description.match(/(\d+(?:\.\d+)?)\s*mm\s+long\b/i);
      let pipeLengthM = rawIndividualPipeLength || 12;
      if (explicitLengthM) pipeLengthM = Number(explicitLengthM[1]);
      else if (explicitLengthMm) pipeLengthM = Number(explicitLengthMm[1]) / 1000;
      return {
        ...orig,
        itemType: "straight_pipe",
        materialType: "steel",
        specs: {
          ...specs,
          nominalBoreMm: dn,
          wallThicknessMm,
          scheduleType: rawScheduleType || "wall_thickness",
          scheduleNumber: rawScheduleNumber || "",
          individualPipeLength: pipeLengthM,
          lengthUnit: "meters",
          quantityType: unitIsMetres ? "total_length" : "number_of_pipes",
          quantityValue: rawQuantityValue || 1,
        },
      };
    }
    return orig;
  };

  // Process each entry
  entries.forEach((rawEntry) => {
    const entry = reclassifyMiscPipeRow(rawEntry);
    const rawClientItemNumber = entry.clientItemNumber;
    const itemNumber = rawClientItemNumber || entry.id;
    const rawQuantityValue = entry.specs?.quantityValue;
    const rawCalculatedPipeCountForQty = entry.calculation?.calculatedPipeCount;
    const qty = rawQuantityValue || rawCalculatedPipeCountForQty || 1;
    const steelSpec = getSteelSpecName(entry, steelSpecLookup);
    const flangeSpec = getFlangeSpec(entry, flangeSpecLookup);

    if (entry.itemType === "bend") {
      const rawNominalBoreMm = entry.specs?.nominalBoreMm;
      // BEND
      const nb = rawNominalBoreMm || 100;
      const rawBendDegrees = entry.specs?.bendDegrees;
      const angle = rawBendDegrees || 90;
      const rawBendRadiusType = entry.specs?.bendRadiusType;
      const rawSpecsBendType = entry.specs?.bendType;
      const bendType = rawBendRadiusType || rawSpecsBendType || "1.5D";
      const rawScheduleNumber = entry.specs?.scheduleNumber;
      const schedule = rawScheduleNumber || "";

      // Material-aware key so HDPE bends don't merge with steel bends
      // of the same NB. Falls through to the existing steel-only key
      // shape when materialType is undefined.
      const rawBendMaterialType = entry.materialType;
      const bendMaterialType = rawBendMaterialType || "steel";
      const key = `BEND_${bendMaterialType}_${nb}_${angle}_${bendType}_${steelSpec}_${schedule}`;
      const existing = consolidatedBends.get(key);
      const rawTotalWeight = entry.calculation?.totalWeight;
      const rawBendWeight = entry.calculation?.bendWeight;
      const rawTangentWeight = entry.calculation?.tangentWeight;
      const cachedBendWeight = rawTotalWeight || (rawBendWeight || 0) + (rawTangentWeight || 0);
      const bendWeight = cachedBendWeight || fallbackBendWeight(entry, nb, globalHdpeSdr);

      const rawNumberOfSegments = entry.specs?.numberOfSegments;

      // Calculate bend weld lengths
      const segments = rawNumberOfSegments || 5;
      const mitreWelds = segments - 1;
      const rawOutsideDiameterMm = entry.calculation?.outsideDiameterMm;
      const rawWallThicknessMm = entry.calculation?.wallThicknessMm;
      const hdpeDims =
        bendMaterialType === "hdpe" && (!rawOutsideDiameterMm || !rawWallThicknessMm)
          ? resolveHdpeDims(nb, entry, globalHdpeSdr, globalHdpePressureRating)
          : null;
      const hdpeDimsOd = hdpeDims ? hdpeDims.od : 0;
      const hdpeDimsWt = hdpeDims ? hdpeDims.wt : 0;
      const od = rawOutsideDiameterMm || hdpeDimsOd;
      const wt = rawWallThicknessMm || hdpeDimsWt;
      const mitreWeldLength = mitreWelds * qty * ((Math.PI * od) / 1000);

      const rawBendType = entry.specs?.bendType;
      const rawSpecsBendRadiusType = entry.specs?.bendRadiusType;

      // Calculate bend surface areas from specs (like ReviewSubmitStep)
      const bendRadiusType = rawBendType || rawSpecsBendRadiusType || "1.5D";
      const radiusFactor = parseFloat(bendRadiusType.replace("D", "")) || 1.5;
      const bendRadiusMm = nb * radiusFactor;
      const bendAngleRad = (angle * Math.PI) / 180;
      const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;

      const rawTangentLengths = entry.specs?.tangentLengths;

      // Add tangent lengths
      const tangentLengths = rawTangentLengths || [];
      let tangentLengthM = 0;
      if (tangentLengths[0]) tangentLengthM += tangentLengths[0] / 1000;
      if (tangentLengths[1]) tangentLengthM += tangentLengths[1] / 1000;

      const totalBendLengthM = arcLengthM + tangentLengthM;
      const odM = od / 1000;
      const idM = (od - 2 * wt) / 1000;
      const extAreaM2 = Math.PI * odM * totalBendLengthM * qty;
      const intAreaM2 = Math.PI * idM * totalBendLengthM * qty;

      // Build welds object
      const welds: Record<string, number> = {};
      if (mitreWeldLength > 0) welds["Mitre Weld"] = mitreWeldLength;

      const rawBendEndConfiguration = entry.specs?.bendEndConfiguration;

      // Flange welds for bends
      const bendEndConfig = rawBendEndConfiguration || "PE";
      const bendFlangeCount = getFlangeCountFromConfig(bendEndConfig, "bend");
      if (bendFlangeCount.main > 0) {
        // x2 for inside + outside
        const flangeWeldLength = bendFlangeCount.main * qty * ((Math.PI * od) / 1000) * 2;
        if (flangeWeldLength > 0) welds["Flange Weld"] = flangeWeldLength;
      }

      if (existing) {
        existing.qty += qty;
        existing.weight += bendWeight * qty;
        existing.entries.push(itemNumber);
        existing.entryIds.push(entry.id);
        const rawMitreWeld = existing.welds?.["Mitre Weld"];
        // Accumulate welds and areas
        if (mitreWeldLength > 0)
          existing.welds = {
            ...existing.welds,
            "Mitre Weld": (rawMitreWeld || 0) + mitreWeldLength,
          };
        const rawFlangeWeld = existing.welds?.["Flange Weld"];
        if (welds["Flange Weld"])
          existing.welds = {
            ...existing.welds,
            "Flange Weld": (rawFlangeWeld || 0) + welds["Flange Weld"],
          };
        const rawIntAreaM2 = existing.intAreaM2;
        existing.intAreaM2 = (rawIntAreaM2 || 0) + intAreaM2;
        const rawExtAreaM2 = existing.extAreaM2;
        existing.extAreaM2 = (rawExtAreaM2 || 0) + extAreaM2;
      } else {
        // Material-aware label — HDPE bends say "HDPE Bend", PVC say
        // "PVC Bend", steel falls back to the steel spec name from
        // getSteelSpecName (resolved earlier from materialGrade).
        const bendMaterialLabel =
          bendMaterialType === "hdpe" ? "HDPE" : bendMaterialType === "pvc" ? "PVC" : steelSpec;
        const rawBendEndConfig = entry.specs?.pipeEndConfiguration;
        const bendFlangeSuffix = flangeConfigSuffix(rawBendEndConfig, bendMaterialType, flangeSpec);
        // SANS 1123 stub-end + backing-flange annotation for HDPE
        // bends. Always emitted for HDPE rows — termination against
        // valves / pumps / steel mains is the assumed jointing
        // method unless the project is explicitly butt-fusion-only.
        // PN derived from globalSpecs first, then from the resolved
        // SDR via the PE100 SDR↔PN table (so a project that only
        // specified an SDR still gets the right backing-flange spec).
        const hdpeBendSdr = hdpeDims ? hdpeDims.sdr : null;
        const hdpeBendPn = hdpeBendSdr
          ? resolveHdpePn(hdpeBendSdr, globalHdpePressureRating)
          : null;
        const hdpeBendStubAssembly =
          bendMaterialType === "hdpe" && hdpeBendPn
            ? sans1123StubAssemblyDescription(hdpeBendPn)
            : null;
        const hdpeBendSdrLabel =
          bendMaterialType === "hdpe" && hdpeBendSdr ? ` PE100 SDR${hdpeBendSdr}` : "";
        const hdpeBendStubSuffix = hdpeBendStubAssembly ? `, ${hdpeBendStubAssembly}` : "";
        // Centre-to-face dimension on the bend description — gives
        // the supplier the take-off geometry without needing to
        // open the bend table.
        const bendCfMm = bendCenterToFaceMm(nb, angle, bendType);
        const bendCfSuffix = bendCfMm > 0 ? `, ${bendCfMm}mm C/F` : "";
        consolidatedBends.set(key, {
          description:
            `${nb}NB ${angle}° ${bendType} Bend ${bendMaterialLabel}${hdpeBendSdrLabel} ${schedule ? `Sch${schedule.replace("Sch", "")}` : ""}${bendFlangeSuffix}${bendCfSuffix}${hdpeBendStubSuffix}`.trim(),
          qty: qty,
          unit: "Each",
          weight: bendWeight * qty,
          entries: [itemNumber],
          entryIds: [entry.id],
          welds: keys(welds).length > 0 ? welds : undefined,
          intAreaM2: intAreaM2 > 0 ? intAreaM2 : undefined,
          extAreaM2: extAreaM2 > 0 ? extAreaM2 : undefined,
          material: materialOfEntry(entry),
        });
      }

      // Flanges for bends (using bendEndConfig declared above)
      const flangeCount = getFlangeCountFromConfig(bendEndConfig, "bend");
      const flangeTypeName = getFlangeTypeName(bendEndConfig);
      const rawFlangeStandardId2 = entry.specs?.flangeStandardId;
      const bendFlangeStandardId = rawFlangeStandardId2 || globalSpecs?.flangeStandardId;
      const bendFlangeStandardCode =
        bendFlangeStandardId && masterData?.flangeStandards
          ? masterData.flangeStandards.find((s: any) => s.id === bendFlangeStandardId)?.code
          : "";
      const rawFlangeTypeCode = entry.specs?.flangeTypeCode;
      const bendFlangeTypeCode = rawFlangeTypeCode || globalSpecs?.flangeTypeCode;
      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpec}_${flangeTypeName}`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * qty;
        const flangeWeightKg = flangeWeight(
          allWeights,
          nb,
          flangeSpec.split(" ").pop() || "PN16",
          bendFlangeStandardCode ?? null,
          bendFlangeTypeCode,
        );

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeightKg * flangeQty;
          existingFlange.entries.push(itemNumber);
          existingFlange.entryIds.push(entry.id);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB ${flangeTypeName} Flange ${flangeSpec}`,
            qty: flangeQty,
            unit: "Each",
            weight: flangeWeightKg * flangeQty,
            entries: [itemNumber],
            entryIds: [entry.id],
          });
        }

        if (materialOfEntry(entry) === "hdpe") {
          addHdpeStubItem(
            nb,
            flangeSpec.split(" ").pop() || "",
            globalHdpeSdr,
            flangeQty,
            itemNumber,
            entry.id,
          );
        } else if (materialOfEntry(entry) === "pvc") {
          addPvcStubItem(
            nb,
            flangeSpec.split(" ").pop() || "",
            globalSpecs?.pvcType,
            flangeQty,
            itemNumber,
            entry.id,
          );
        }

        // BNW for bend flanges - use bolt set count (2 same-sized ends = 1 bolt set)
        const bnwInfo = bnwSetInfo(allBnwSets, nb, flangeSpec.split(" ").pop() || "PN16");
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpec}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
        const boltSetQty = boltSetCountPerBend(bendEndConfig) * qty;

        if (existingBnw) {
          existingBnw.qty += boltSetQty;
          existingBnw.weight += bnwWeight * boltSetQty;
          existingBnw.entries.push(itemNumber);
          existingBnw.entryIds.push(entry.id);
        } else {
          consolidatedBnwSets.set(bnwKey, {
            description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpec}`,
            qty: boltSetQty,
            unit: "sets",
            weight: bnwWeight * boltSetQty,
            entries: [itemNumber],
            entryIds: [entry.id],
          });
        }

        // Gaskets for bend flanges
        if (globalSpecs?.gasketType) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpec}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = gasketWeightLookup(allGaskets, globalSpecs.gasketType, nb);

          if (existingGasket) {
            existingGasket.qty += flangeQty;
            existingGasket.weight += gasketWeight * flangeQty;
            existingGasket.entries.push(itemNumber);
            existingGasket.entryIds.push(entry.id);
          } else {
            consolidatedGaskets.set(gasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpec}`,
              qty: flangeQty,
              unit: "Each",
              weight: gasketWeight * flangeQty,
              entries: [itemNumber],
              entryIds: [entry.id],
            });
          }
        }
      }

      const rawStubs = entry.specs?.stubs;

      // Handle stub flanges for bends
      // Stubs always have flanges when they have a nominalBoreMm set
      const stubs = rawStubs || [];
      stubs.forEach((stub: any, stubIndex: number) => {
        const stubNb = stub.nominalBoreMm;

        // A stub has a flange if it has a valid NB (stubs are always flanged by design)
        if (stubNb && stubNb > 0) {
          // Stub flange - stubs are typically Slip On flanges
          const stubFlangeKey = `FLANGE_${stubNb}_${flangeSpec}_${flangeTypeName}`;
          const existingStubFlange = consolidatedFlanges.get(stubFlangeKey);
          const stubFlangeWeight = flangeWeight(
            allWeights,
            stubNb,
            flangeSpec.split(" ").pop() || "PN16",
            bendFlangeStandardCode ?? null,
            bendFlangeTypeCode,
          );

          if (existingStubFlange) {
            existingStubFlange.qty += qty;
            existingStubFlange.weight += stubFlangeWeight * qty;
            if (!existingStubFlange.entries.includes(itemNumber)) {
              existingStubFlange.entries.push(itemNumber);
              existingStubFlange.entryIds.push(entry.id);
            }
          } else {
            consolidatedFlanges.set(stubFlangeKey, {
              description: `${stubNb}NB ${flangeTypeName} Flange ${flangeSpec}`,
              qty: qty,
              unit: "Each",
              weight: stubFlangeWeight * qty,
              entries: [itemNumber],
              entryIds: [entry.id],
            });
          }

          // Stub BNW set - each stub flange needs its own bolt set
          const stubBnwInfo = bnwSetInfo(allBnwSets, stubNb, flangeSpec.split(" ").pop() || "PN16");
          const stubBnwKey = `BNW_${stubBnwInfo.boltSize}_x${stubBnwInfo.holesPerFlange}_${stubNb}NB_${flangeSpec}`;
          const existingStubBnw = consolidatedBnwSets.get(stubBnwKey);
          const stubBnwWeight = stubBnwInfo.weightPerHole * stubBnwInfo.holesPerFlange;

          if (existingStubBnw) {
            existingStubBnw.qty += qty;
            existingStubBnw.weight += stubBnwWeight * qty;
            if (!existingStubBnw.entries.includes(itemNumber)) {
              existingStubBnw.entries.push(itemNumber);
              existingStubBnw.entryIds.push(entry.id);
            }
          } else {
            consolidatedBnwSets.set(stubBnwKey, {
              description: `${stubBnwInfo.boltSize} BNW Set x${stubBnwInfo.holesPerFlange} for ${stubNb}NB ${flangeSpec}`,
              qty: qty,
              unit: "sets",
              weight: stubBnwWeight * qty,
              entries: [itemNumber],
              entryIds: [entry.id],
            });
          }

          // Stub gasket
          if (globalSpecs?.gasketType) {
            const stubGasketKey = `GASKET_${globalSpecs.gasketType}_${stubNb}NB_${flangeSpec}`;
            const existingStubGasket = consolidatedGaskets.get(stubGasketKey);
            const stubGasketWeight = gasketWeightLookup(allGaskets, globalSpecs.gasketType, stubNb);

            if (existingStubGasket) {
              existingStubGasket.qty += qty;
              existingStubGasket.weight += stubGasketWeight * qty;
              if (!existingStubGasket.entries.includes(itemNumber)) {
                existingStubGasket.entries.push(itemNumber);
                existingStubGasket.entryIds.push(entry.id);
              }
            } else {
              consolidatedGaskets.set(stubGasketKey, {
                description: `${globalSpecs.gasketType} Gasket ${stubNb}NB ${flangeSpec}`,
                qty: qty,
                unit: "Each",
                weight: stubGasketWeight * qty,
                entries: [itemNumber],
                entryIds: [entry.id],
              });
            }
          }
        }
      });

      // Blank flanges for bends
      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const rawBlankFlangeNominalBoreMm = entry.specs?.blankFlangeNominalBoreMm;
        const blankNb = rawBlankFlangeNominalBoreMm || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpec}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * qty;
        const blankWeight =
          flangeWeight(
            allWeights,
            blankNb,
            flangeSpec.split(" ").pop() || "PN16",
            bendFlangeStandardCode ?? null,
            bendFlangeTypeCode,
          ) * 0.6;
        const blankSurfaceArea = blankFlangeSurfaceArea(FLANGE_OD, blankNb);
        const blankExtArea = blankSurfaceArea.external * blankQty;
        const blankIntArea = blankSurfaceArea.internal * blankQty;

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          const rawExtAreaM22 = existingBlank.extAreaM2;
          existingBlank.extAreaM2 = (rawExtAreaM22 || 0) + blankExtArea;
          const rawIntAreaM22 = existingBlank.intAreaM2;
          existingBlank.intAreaM2 = (rawIntAreaM22 || 0) + blankIntArea;
          if (!existingBlank.entries.includes(itemNumber)) {
            existingBlank.entries.push(itemNumber);
            existingBlank.entryIds.push(entry.id);
          }
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpec}`,
            qty: blankQty,
            unit: "Each",
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            entryIds: [entry.id],
            extAreaM2: blankExtArea,
            intAreaM2: blankIntArea,
          });
        }
      }
    } else if (entry.itemType === "fitting") {
      const rawNominalDiameterMm = entry.specs?.nominalDiameterMm;
      const rawSpecsNominalBoreMm = entry.specs?.nominalBoreMm;
      // FITTING
      const nb = rawNominalDiameterMm || rawSpecsNominalBoreMm || 100;
      const rawBranchNominalDiameterMm = entry.specs?.branchNominalDiameterMm;
      const rawSpecsBranchNominalBoreMm = entry.specs?.branchNominalBoreMm;
      const branchNb = rawBranchNominalDiameterMm || rawSpecsBranchNominalBoreMm || nb;
      const rawFittingType = entry.specs?.fittingType;
      const fittingType = rawFittingType || "TEE";
      const rawScheduleNumber2 = entry.specs?.scheduleNumber;
      const schedule = rawScheduleNumber2 || "";

      const key = `FITTING_${fittingType}_${nb}_${branchNb}_${steelSpec}_${schedule}`;
      const existing = consolidatedFittings.get(key);
      const rawTotalWeight2 = entry.calculation?.totalWeight;
      const rawCalcFittingWeight = entry.calculation?.fittingWeight;
      const cachedFittingWeight = rawTotalWeight2 || rawCalcFittingWeight || 0;
      const fittingWeight =
        cachedFittingWeight || fallbackFittingWeight(entry, nb, branchNb, globalHdpeSdr);

      // Format fitting type for display
      let displayType = fittingType
        .replace(/_/g, " ")
        .toLowerCase()
        .split(" ")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      if (["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(fittingType)) {
        displayType = displayType.replace(/Tee/i, "Equal Tee");
      }

      const rawOutsideDiameterMm2 = entry.calculation?.outsideDiameterMm;
      const rawWallThicknessMm2 = entry.calculation?.wallThicknessMm;
      const rawFittingMaterialTypeForDims = entry.materialType;
      const fittingMaterialTypeForDims = rawFittingMaterialTypeForDims || "steel";
      const hdpeFittingDims =
        fittingMaterialTypeForDims === "hdpe" && (!rawOutsideDiameterMm2 || !rawWallThicknessMm2)
          ? resolveHdpeDims(nb, entry, globalHdpeSdr, globalHdpePressureRating)
          : null;
      const hdpeFittingDimsOd = hdpeFittingDims ? hdpeFittingDims.od : 0;
      const hdpeFittingDimsWt = hdpeFittingDims ? hdpeFittingDims.wt : 0;

      // Calculate fitting weld lengths and surface areas
      const od = rawOutsideDiameterMm2 || hdpeFittingDimsOd;
      const wt = rawWallThicknessMm2 || hdpeFittingDimsWt;
      const rawPipeEndConfiguration = entry.specs?.pipeEndConfiguration;
      const fittingEndConfig = rawPipeEndConfiguration || "PE";
      const fittingFlangeCount = getFlangeCountFromConfig(fittingEndConfig, "fitting");

      const rawBranchOutsideDiameterMm = entry.calculation?.branchOutsideDiameterMm;
      const rawBranchWallThicknessMm = entry.calculation?.branchWallThicknessMm;
      // For HDPE reducing tees / laterals, branch dims come from the
      // PE100 table at the branch NB. For equal-branch fittings the
      // main and branch resolve to the same row so the lookup is a
      // no-op cost — clarity wins.
      const hdpeFittingBranchDims =
        fittingMaterialTypeForDims === "hdpe" &&
        (!rawBranchOutsideDiameterMm || !rawBranchWallThicknessMm)
          ? resolveHdpeDims(branchNb, entry, globalHdpeSdr, globalHdpePressureRating)
          : null;
      const hdpeFittingBranchOd = hdpeFittingBranchDims ? hdpeFittingBranchDims.od : 0;
      const hdpeFittingBranchWt = hdpeFittingBranchDims ? hdpeFittingBranchDims.wt : 0;

      // Branch dimensions
      const branchOd = rawBranchOutsideDiameterMm || hdpeFittingBranchOd || od;
      const branchWt = rawBranchWallThicknessMm || hdpeFittingBranchWt || wt;

      // Calculate fitting welds (tee weld + flange welds)
      // One tee weld per fitting
      const teeWeldLength = qty * ((Math.PI * od) / 1000);
      let flangeWeldLength = 0;
      if (fittingFlangeCount.main > 0) {
        flangeWeldLength = fittingFlangeCount.main * qty * ((Math.PI * od) / 1000) * 2;
      }
      if (fittingFlangeCount.branch > 0) {
        flangeWeldLength += fittingFlangeCount.branch * qty * ((Math.PI * branchOd) / 1000) * 2;
      }

      const rawPipeLengthAMm = entry.specs?.pipeLengthAMm;

      // Calculate fitting surface area from specs (like ReviewSubmitStep)
      const lengthA = rawPipeLengthAMm || 0;
      const rawPipeLengthBMm = entry.specs?.pipeLengthBMm;
      const lengthB = rawPipeLengthBMm || 0;
      const rawTeeHeightMm = entry.specs?.teeHeightMm;
      const rawCalcTeeHeightMm = entry.calculation?.teeHeightMm;
      const teeHeight = rawTeeHeightMm || rawCalcTeeHeightMm || branchNb * 2;

      // Run length = Section A + Section B
      const runLengthM = (lengthA + lengthB) / 1000;
      // Branch length approximation = tee height or 2x branch OD
      const branchLengthM = teeHeight / 1000;

      const odM = od / 1000;
      const idM = (od - 2 * wt) / 1000;
      const branchOdM = branchOd / 1000;
      const branchIdM = (branchOd - 2 * branchWt) / 1000;

      // Calculate areas (run + branch)
      const runExtArea = Math.PI * odM * runLengthM;
      const branchExtArea = Math.PI * branchOdM * branchLengthM;
      const runIntArea = Math.PI * idM * runLengthM;
      const branchIntArea = Math.PI * branchIdM * branchLengthM;

      const extAreaM2 = qty * (runExtArea + branchExtArea);
      const intAreaM2 = qty * (runIntArea + branchIntArea);

      // Determine weld type name based on fitting type and angle
      const isLateral = ["LATERAL", "REDUCING_LATERAL"].includes(fittingType);
      const isShortTee = ["SHORT_TEE", "UNEQUAL_SHORT_TEE", "SHORT_REDUCING_TEE"].includes(
        fittingType,
      );
      const isGussetTee = ["GUSSET_TEE", "UNEQUAL_GUSSET_TEE", "GUSSET_REDUCING_TEE"].includes(
        fittingType,
      );
      const angleRange = entry.specs?.angleRange as string | undefined;
      const isAngle45OrAbove = angleRange === "60-90" || angleRange === "45-59";

      let weldTypeName: string;
      if (isLateral) {
        weldTypeName = isAngle45OrAbove ? "Lat Weld 45+" : "Lat Weld <45";
      } else if (isGussetTee) {
        weldTypeName = "Gusset Tee Weld";
      } else if (isShortTee) {
        weldTypeName = "Tee Weld";
      } else {
        weldTypeName = "Tee Weld";
      }

      // Build welds object
      const welds: Record<string, number> = {};
      if (teeWeldLength > 0) welds[weldTypeName] = teeWeldLength;
      if (flangeWeldLength > 0) welds["Flange Weld"] = flangeWeldLength;

      if (existing) {
        existing.qty += qty;
        existing.weight += fittingWeight * qty;
        existing.entries.push(itemNumber);
        existing.entryIds.push(entry.id);
        const rawWeldTypeName = existing.welds?.[weldTypeName];
        // Accumulate welds and areas
        if (teeWeldLength > 0)
          existing.welds = {
            ...existing.welds,
            [weldTypeName]: (rawWeldTypeName || 0) + teeWeldLength,
          };
        const rawFlangeWeld2 = existing.welds?.["Flange Weld"];
        if (flangeWeldLength > 0)
          existing.welds = {
            ...existing.welds,
            "Flange Weld": (rawFlangeWeld2 || 0) + flangeWeldLength,
          };
        const rawIntAreaM23 = existing.intAreaM2;
        existing.intAreaM2 = (rawIntAreaM23 || 0) + intAreaM2;
        const rawExtAreaM23 = existing.extAreaM2;
        existing.extAreaM2 = (rawExtAreaM23 || 0) + extAreaM2;
      } else {
        const rawFittingMaterialType = entry.materialType;
        const fittingMaterialType = rawFittingMaterialType || "steel";
        const fittingMaterialLabel =
          fittingMaterialType === "hdpe"
            ? "HDPE"
            : fittingMaterialType === "pvc"
              ? "PVC"
              : steelSpec;
        const fittingFlangeSuffix = flangeConfigSuffix(
          fittingEndConfig,
          fittingMaterialType,
          flangeSpec,
        );
        // SANS 1123 stub-end + backing-flange annotation for HDPE
        // fittings — always emitted (mirrors the bend logic). PN
        // derived from globalSpecs first, then from the resolved
        // SDR via the PE100 SDR↔PN table.
        const hdpeFittingSdrValue = hdpeFittingDims ? hdpeFittingDims.sdr : null;
        const hdpeFittingPn = hdpeFittingSdrValue
          ? resolveHdpePn(hdpeFittingSdrValue, globalHdpePressureRating)
          : null;
        const hdpeFittingStubAssembly =
          fittingMaterialType === "hdpe" && hdpeFittingPn
            ? sans1123StubAssemblyDescription(hdpeFittingPn)
            : null;
        const hdpeFittingSdrLabel =
          fittingMaterialType === "hdpe" && hdpeFittingSdrValue
            ? ` PE100 SDR${hdpeFittingSdrValue}`
            : "";
        const hdpeFittingStubSuffix = hdpeFittingStubAssembly ? `, ${hdpeFittingStubAssembly}` : "";
        // Fitting body dimensions on the description, sourced from the
        // same specs the manual RFQ form binds to:
        //   - Tees / laterals: pipeLengthAMm × pipeLengthBMm  (run × branch)
        //     e.g. "220×110mm". For laterals where the branch height
        //     lives on lateralHeightMm, fall through to that.
        //   - Reducers: reducerLengthMm  (end-to-end length)
        //     e.g. "350mm L"
        // Falls silent if the underlying spec values aren't populated
        // — better to omit than to fabricate a number.
        // CONCENTRIC_REDUCER is the legacy fittingType written by the
        // Nix → wizard mapping before v1.5.2 swapped it for the
        // canonical CON_REDUCER constant. Existing drafts created
        // before the fix still carry the legacy value, so match both
        // here. Same shape applies to RfqWizardStore + FittingForm —
        // they should also accept the legacy variant when reading.
        const isReducerType = ["CON_REDUCER", "CONCENTRIC_REDUCER", "ECCENTRIC_REDUCER"].includes(
          fittingType,
        );
        const isLateralType = ["LATERAL", "Y_PIECE", "REDUCING_LATERAL"].includes(fittingType);
        const isTeeFamily = fittingType.includes("TEE");
        const rawSpecsLengthA = entry.specs?.pipeLengthAMm;
        const rawSpecsLengthB = entry.specs?.pipeLengthBMm;
        const rawSpecsReducerLength = entry.specs?.reducerLengthMm;
        const rawSpecsLateralHeight = entry.specs?.lateralHeightMm;
        const specsLengthA = rawSpecsLengthA ? Math.round(Number(rawSpecsLengthA)) : null;
        const specsLengthB = rawSpecsLengthB ? Math.round(Number(rawSpecsLengthB)) : null;
        const specsReducerLength = rawSpecsReducerLength
          ? Math.round(Number(rawSpecsReducerLength))
          : null;
        const specsLateralHeight = rawSpecsLateralHeight
          ? Math.round(Number(rawSpecsLateralHeight))
          : null;

        // HDPE catalogue fallback — only consulted when the entry is
        // HDPE and the entry.specs path returns null. Catalogue
        // values come from manufacturer brochures (PE100 SDR 11
        // butt-fusion) via @annix/product-data/hdpe. Steel and PVC
        // fittings rely on entry.specs only — no catalogue fallback.
        const isHdpeFitting = fittingMaterialType === "hdpe";
        const tableTeeDims = isHdpeFitting && isTeeFamily ? hdpeTeeDimensions(nb, branchNb) : null;
        // Reducer branch resolution. Three sources, in priority order:
        //   1. Real branchNb from entry.specs (Nix found the smaller end
        //      in the BOQ doc, e.g. "355x250 reducer")
        //   2. Inferred branchNb from the catalogue when the source doc
        //      gave only the main NB (e.g. "355NB Concentric Reducer").
        //      Picks the largest standard reduction available — the
        //      most-flexible choice for the supplier to source.
        //   3. null (no catalogue → no suffix)
        // The inferred branch gets a "*" marker on the description so
        // the quoter knows the reduction pair wasn't in the source.
        const reducerHasExplicitBranch = isReducerType && branchNb !== nb;
        const inferredReducerBranch =
          isHdpeFitting && isReducerType && !reducerHasExplicitBranch
            ? inferReducerBranchDn(nb)
            : null;
        const effectiveReducerBranchNb = reducerHasExplicitBranch
          ? branchNb
          : (inferredReducerBranch ?? branchNb);
        const tableReducerLength =
          isHdpeFitting && isReducerType ? hdpeReducerLength(nb, effectiveReducerBranchNb) : null;
        const tableLengthA = tableTeeDims ? tableTeeDims.runFaceToFaceMm : null;
        const tableLengthB = tableTeeDims ? tableTeeDims.branchFaceToCentreMm : null;

        const lengthA = specsLengthA || tableLengthA;
        const lengthB = specsLengthB || tableLengthB;
        const reducerLength = specsReducerLength || tableReducerLength;

        let fittingDimSuffix = "";
        if (isReducerType && reducerLength) {
          // Show the (possibly inferred) reduction pair in the suffix
          // so the supplier knows which reducer this is. Asterisk
          // indicates the branch was inferred from catalogue rather
          // than supplied in the source BOQ.
          const inferredMarker = inferredReducerBranch != null ? "*" : "";
          const branchLabel =
            effectiveReducerBranchNb && effectiveReducerBranchNb !== nb
              ? `${nb}×${effectiveReducerBranchNb}NB${inferredMarker}, `
              : "";
          fittingDimSuffix = `, ${branchLabel}${reducerLength}mm L`;
        } else if (isTeeFamily && lengthA && lengthB) {
          fittingDimSuffix = `, ${lengthA}×${lengthB}mm`;
        } else if (isLateralType) {
          if (lengthA && lengthB) {
            fittingDimSuffix = `, ${lengthA}×${lengthB}mm`;
          } else if (lengthA && specsLateralHeight) {
            fittingDimSuffix = `, ${lengthA}×${specsLateralHeight}mm`;
          }
        }
        consolidatedFittings.set(key, {
          description:
            `${nb}NB${branchNb !== nb ? `x${branchNb}NB` : ""} ${displayType} ${fittingMaterialLabel}${hdpeFittingSdrLabel} ${schedule ? `Sch${schedule.replace("Sch", "")}` : ""}${fittingFlangeSuffix}${fittingDimSuffix}${hdpeFittingStubSuffix}`.trim(),
          qty: qty,
          unit: "Each",
          weight: fittingWeight * qty,
          entries: [itemNumber],
          entryIds: [entry.id],
          material: materialOfEntry(entry),
          welds: keys(welds).length > 0 ? welds : undefined,
          intAreaM2: intAreaM2 > 0 ? intAreaM2 : undefined,
          extAreaM2: extAreaM2 > 0 ? extAreaM2 : undefined,
        });
      }

      // Flanges for fittings (using fittingEndConfig declared above)
      const flangeCount = getFlangeCountFromConfig(fittingEndConfig, "fitting");
      const fittingFlangeTypeName = getFlangeTypeName(fittingEndConfig);
      const isEqualBranch = branchNb === nb;
      const fittingBoltSets = boltSetCountPerFitting(fittingEndConfig, isEqualBranch);
      const rawFlangeStandardId3 = entry.specs?.flangeStandardId;
      const fittingFlangeStandardId = rawFlangeStandardId3 || globalSpecs?.flangeStandardId;
      const fittingFlangeStandardCode =
        fittingFlangeStandardId && masterData?.flangeStandards
          ? masterData.flangeStandards.find((s: any) => s.id === fittingFlangeStandardId)?.code
          : "";
      const rawFlangeTypeCode2 = entry.specs?.flangeTypeCode;
      const fittingFlangeTypeCode = rawFlangeTypeCode2 || globalSpecs?.flangeTypeCode;

      // Main flanges
      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpec}_${fittingFlangeTypeName}`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * qty;
        const flangeWeightKg = flangeWeight(
          allWeights,
          nb,
          flangeSpec.split(" ").pop() || "PN16",
          fittingFlangeStandardCode ?? null,
          fittingFlangeTypeCode,
        );

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeightKg * flangeQty;
          existingFlange.entries.push(itemNumber);
          existingFlange.entryIds.push(entry.id);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB ${fittingFlangeTypeName} Flange ${flangeSpec}`,
            qty: flangeQty,
            unit: "Each",
            weight: flangeWeightKg * flangeQty,
            entries: [itemNumber],
            entryIds: [entry.id],
          });
        }

        if (materialOfEntry(entry) === "hdpe") {
          addHdpeStubItem(
            nb,
            flangeSpec.split(" ").pop() || "",
            globalHdpeSdr,
            flangeQty,
            itemNumber,
            entry.id,
          );
        } else if (materialOfEntry(entry) === "pvc") {
          addPvcStubItem(
            nb,
            flangeSpec.split(" ").pop() || "",
            globalSpecs?.pvcType,
            flangeQty,
            itemNumber,
            entry.id,
          );
        }

        // BNW for main flanges - use bolt set count (3 same-sized ends = 2 bolt sets)
        const bnwInfo = bnwSetInfo(allBnwSets, nb, flangeSpec.split(" ").pop() || "PN16");
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpec}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
        const mainBoltSetQty = fittingBoltSets.mainBoltSets * qty;

        if (mainBoltSetQty > 0) {
          if (existingBnw) {
            existingBnw.qty += mainBoltSetQty;
            existingBnw.weight += bnwWeight * mainBoltSetQty;
            existingBnw.entries.push(itemNumber);
            existingBnw.entryIds.push(entry.id);
          } else {
            consolidatedBnwSets.set(bnwKey, {
              description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpec}`,
              qty: mainBoltSetQty,
              unit: "sets",
              weight: bnwWeight * mainBoltSetQty,
              entries: [itemNumber],
              entryIds: [entry.id],
            });
          }
        }

        // Gaskets for main flanges
        if (globalSpecs?.gasketType) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpec}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = gasketWeightLookup(allGaskets, globalSpecs.gasketType, nb);

          if (existingGasket) {
            existingGasket.qty += flangeQty;
            existingGasket.weight += gasketWeight * flangeQty;
            existingGasket.entries.push(itemNumber);
            existingGasket.entryIds.push(entry.id);
          } else {
            consolidatedGaskets.set(gasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpec}`,
              qty: flangeQty,
              unit: "Each",
              weight: gasketWeight * flangeQty,
              entries: [itemNumber],
              entryIds: [entry.id],
            });
          }
        }
      }

      // Branch flanges (if different NB)
      if (flangeCount.branch > 0) {
        const branchFlangeKey = `FLANGE_${branchNb}_${flangeSpec}_${fittingFlangeTypeName}`;
        const existingBranchFlange = consolidatedFlanges.get(branchFlangeKey);
        const branchFlangeQty = flangeCount.branch * qty;
        const branchFlangeWeight = flangeWeight(
          allWeights,
          branchNb,
          flangeSpec.split(" ").pop() || "PN16",
          fittingFlangeStandardCode ?? null,
          fittingFlangeTypeCode,
        );

        if (existingBranchFlange) {
          existingBranchFlange.qty += branchFlangeQty;
          existingBranchFlange.weight += branchFlangeWeight * branchFlangeQty;
          existingBranchFlange.entries.push(itemNumber);
          existingBranchFlange.entryIds.push(entry.id);
        } else {
          consolidatedFlanges.set(branchFlangeKey, {
            description: `${branchNb}NB ${fittingFlangeTypeName} Flange ${flangeSpec}`,
            qty: branchFlangeQty,
            unit: "Each",
            weight: branchFlangeWeight * branchFlangeQty,
            entries: [itemNumber],
            entryIds: [entry.id],
          });
        }

        if (materialOfEntry(entry) === "hdpe") {
          addHdpeStubItem(
            branchNb,
            flangeSpec.split(" ").pop() || "",
            globalHdpeSdr,
            branchFlangeQty,
            itemNumber,
            entry.id,
          );
        } else if (materialOfEntry(entry) === "pvc") {
          addPvcStubItem(
            branchNb,
            flangeSpec.split(" ").pop() || "",
            globalSpecs?.pvcType,
            branchFlangeQty,
            itemNumber,
            entry.id,
          );
        }

        // BNW for branch flanges - use bolt set count for branch (only counts when different size)
        const branchBnwInfo = bnwSetInfo(
          allBnwSets,
          branchNb,
          flangeSpec.split(" ").pop() || "PN16",
        );
        const branchBnwKey = `BNW_${branchBnwInfo.boltSize}_x${branchBnwInfo.holesPerFlange}_${branchNb}NB_${flangeSpec}`;
        const existingBranchBnw = consolidatedBnwSets.get(branchBnwKey);
        const branchBnwWeight = branchBnwInfo.weightPerHole * branchBnwInfo.holesPerFlange;
        const branchBoltSetQty = fittingBoltSets.branchBoltSets * qty;

        if (branchBoltSetQty > 0) {
          if (existingBranchBnw) {
            existingBranchBnw.qty += branchBoltSetQty;
            existingBranchBnw.weight += branchBnwWeight * branchBoltSetQty;
            existingBranchBnw.entries.push(itemNumber);
            existingBranchBnw.entryIds.push(entry.id);
          } else {
            consolidatedBnwSets.set(branchBnwKey, {
              description: `${branchBnwInfo.boltSize} BNW Set x${branchBnwInfo.holesPerFlange} for ${branchNb}NB ${flangeSpec}`,
              qty: branchBoltSetQty,
              unit: "sets",
              weight: branchBnwWeight * branchBoltSetQty,
              entries: [itemNumber],
              entryIds: [entry.id],
            });
          }
        }

        // Gaskets for branch flanges
        if (globalSpecs?.gasketType) {
          const branchGasketKey = `GASKET_${globalSpecs.gasketType}_${branchNb}NB_${flangeSpec}`;
          const existingBranchGasket = consolidatedGaskets.get(branchGasketKey);
          const branchGasketWeight = gasketWeightLookup(
            allGaskets,
            globalSpecs.gasketType,
            branchNb,
          );

          if (existingBranchGasket) {
            existingBranchGasket.qty += branchFlangeQty;
            existingBranchGasket.weight += branchGasketWeight * branchFlangeQty;
            existingBranchGasket.entries.push(itemNumber);
            existingBranchGasket.entryIds.push(entry.id);
          } else {
            consolidatedGaskets.set(branchGasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${branchNb}NB ${flangeSpec}`,
              qty: branchFlangeQty,
              unit: "Each",
              weight: branchGasketWeight * branchFlangeQty,
              entries: [itemNumber],
              entryIds: [entry.id],
            });
          }
        }
      }

      // Blank flanges for fittings
      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const rawBlankFlangeNominalBoreMm2 = entry.specs?.blankFlangeNominalBoreMm;
        const blankNb = rawBlankFlangeNominalBoreMm2 || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpec}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * qty;
        const blankWeight =
          flangeWeight(
            allWeights,
            blankNb,
            flangeSpec.split(" ").pop() || "PN16",
            fittingFlangeStandardCode ?? null,
            fittingFlangeTypeCode,
          ) * 0.6;
        const blankSurfaceArea = blankFlangeSurfaceArea(FLANGE_OD, blankNb);
        const blankExtArea = blankSurfaceArea.external * blankQty;
        const blankIntArea = blankSurfaceArea.internal * blankQty;

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          const rawExtAreaM24 = existingBlank.extAreaM2;
          existingBlank.extAreaM2 = (rawExtAreaM24 || 0) + blankExtArea;
          const rawIntAreaM24 = existingBlank.intAreaM2;
          existingBlank.intAreaM2 = (rawIntAreaM24 || 0) + blankIntArea;
          if (!existingBlank.entries.includes(itemNumber)) {
            existingBlank.entries.push(itemNumber);
            existingBlank.entryIds.push(entry.id);
          }
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpec}`,
            qty: blankQty,
            unit: "Each",
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            entryIds: [entry.id],
            extAreaM2: blankExtArea,
            intAreaM2: blankIntArea,
          });
        }
      }
    } else if (entry.itemType === "misc") {
      // Misc items are split into one of: valves (any description
      // matching valve patterns goes there regardless of material),
      // fasteners (bolts/nuts/gaskets/washers), or material-specific
      // "other" buckets (HDPE end caps, laterals, puddle pipes; PVC
      // fittings; steel offcuts). Items with no productType land in
      // unidentified at the very bottom of the BOQ.
      const rawEntrySpecs = entry.specs;
      const rawSpecs = rawEntrySpecs || {};
      const rawEntryDescription = entry.description;
      const miscDescription = rawEntryDescription || "Item";
      const rawSpecsQuantityValueMisc = rawSpecs.quantityValue;
      const miscQty = rawSpecsQuantityValueMisc || qty || 1;
      const rawSpecsUnit = rawSpecs.unit;
      const miscUnit = rawSpecsUnit || "Each";
      const rawSpecsProductType = rawSpecs.productType;
      const rawSpecsNixItemType = rawSpecs.nixItemType;
      const descLower = miscDescription.toLowerCase();
      const isValveDescription =
        rawSpecsNixItemType === "valve" ||
        /\b(valve|RSV|pinch\s*valve|gate\s*valve|globe\s*valve|ball\s*valve|butterfly\s*valve|check\s*valve|knife\s*valve|hand\s*pump|hydraulic\s*pump)\b/i.test(
          miscDescription,
        );
      // Override `nixItemType === "consumable"` when the description
      // clearly identifies a steel pipe / bend / tee / flange / spool
      // / lateral. The excel-extractor over-matches "consumable" on
      // rows where words like "Carboline" or "epoxy coated" appear in
      // the COATING SPEC of an otherwise-procurement pipe row. Trust
      // the description content over the upstream classification.
      const looksLikePipingDescription =
        /\bDN\s*\d+\s+[^.]*?(pipes?|bends?|tees?|t[-\s]?pieces?|laterals?|reducers?|blank\s*flanges?|spools?|spigot|stub[-\s]?ons?|sweep)\b/i.test(
          miscDescription,
        ) ||
        /\brubber[-\s]?lined\s+(?:mild\s*)?steel\b/i.test(miscDescription) ||
        /\bmild\s*steel\s*pipes?\b/i.test(miscDescription);
      const isFastenerDescription =
        /\b(bolts?|nuts?|washers?|studs?|gaskets?|fasteners?|jointing\s*rings?)\b/i.test(
          miscDescription,
        ) ||
        (rawSpecsNixItemType === "consumable" && !looksLikePipingDescription);

      const miscKey = `MISC_${descLower}_${miscUnit}`;
      // Pick destination map. Valves first (covers cross-material),
      // then fasteners, then per-material "other", then unidentified.
      let dest: Map<string, ConsolidatedItem>;
      let mat: MaterialKey | undefined;
      if (isValveDescription) {
        dest = consolidatedValves;
      } else if (isFastenerDescription) {
        dest = consolidatedFasteners;
      } else if (rawSpecsProductType === "hdpe") {
        dest = consolidatedHdpeOther;
        mat = "hdpe";
      } else if (rawSpecsProductType === "pvc" || rawSpecsProductType === "upvc") {
        dest = consolidatedPvcOther;
        mat = "pvc";
      } else if (rawSpecsProductType === "steel") {
        dest = consolidatedSteelOther;
        mat = "steel";
      } else {
        dest = consolidatedUnidentified;
      }

      // HDPE misc-item description enrichment: end caps and laterals
      // are NOT classified as fittings by Nix (they land in
      // consolidatedHdpeOther via the misc bucket), but we still
      // know their catalogue geometry from packages/product-data/hdpe.
      // Append the canonical dim to the description here so the
      // supplier sees consistent take-off data across every HDPE row,
      // not just the ones that round-tripped through the manual form.
      //
      // DN is parsed in priority order:
      //   1. entry.specs.nominalBoreMm  (set when Nix recognised the size)
      //   2. /(?:DN|OD)\s*(\d{2,4})/    (fallback regex on description)
      const enrichedMiscDescription = ((): string => {
        if (rawSpecsProductType !== "hdpe") return miscDescription;
        const isEndCap = /\bend[\s-]?caps?\b/i.test(miscDescription);
        const lateralAngleMatch = miscDescription.match(
          /\b(45|60|22\.5|11\.25)\s*(?:deg|°)\s*later/i,
        );
        const isLateral = !!lateralAngleMatch || /\blaterals?\b/i.test(miscDescription);
        if (!isEndCap && !isLateral) return miscDescription;
        const rawSpecsDn = rawSpecs.nominalBoreMm;
        const specsDn = rawSpecsDn ? Number(rawSpecsDn) : null;
        // Resolution order: explicit DN/OD prefix → "X mm diameter"
        // pattern (some BOQ authors write "355 mm diameter" instead
        // of "DN355") → null. Without this second pattern, rows like
        // "HDPE PE100 PN 25 (SDR 7.4) pipe end caps / 1) 355 mm
        // diameter" never resolve and stay un-enriched.
        const dnPrefixMatch = miscDescription.match(/(?:DN|OD)\s*(\d{2,4})/i);
        const dnDiameterMatch = miscDescription.match(/(\d{2,4})\s*mm\s*(?:diameter|dia\.?|Ø)/i);
        const regexDn = dnPrefixMatch
          ? Number(dnPrefixMatch[1])
          : dnDiameterMatch
            ? Number(dnDiameterMatch[1])
            : null;
        const dn = specsDn || regexDn;
        if (!dn || !Number.isFinite(dn)) return miscDescription;
        if (/,\s*\d+mm\s+L\b/.test(miscDescription)) return miscDescription;
        if (/,\s*\d+×\d+mm\b/.test(miscDescription)) return miscDescription;
        if (isEndCap) {
          const length = hdpeEndCapLength(dn);
          if (!length) return miscDescription;
          return `${miscDescription}, ${length}mm L`;
        }
        const angleDeg = lateralAngleMatch ? Number(lateralAngleMatch[1]) : 45;
        const dims = lateralDimensions(angleDeg, dn);
        if (!dims) return miscDescription;
        // Estimated values get an asterisk so the supplier knows the
        // dim is interpolated/extrapolated rather than catalogue.
        const estimatedFlag = dims.source === "estimated" ? "*" : "";
        return `${miscDescription}, ${dims.runFaceToFaceMm}×${dims.branchFaceToCentreMm}mm${estimatedFlag}`;
      })();

      // Compute a fallback weight for known misc categories
      // (end caps, pipe boots, puddle pipes, laterals, UPVC bends,
      // steel-other). Without this every HDPE-Other / PVC-Other /
      // Steel-Other row in the BOQ shows 0 kg even when the row's
      // geometry is fully known from the description.
      const miscPerUnitWeight = fallbackMiscWeight(
        entry,
        miscDescription,
        rawSpecsProductType,
        globalHdpeSdr,
      );
      const miscRowWeight = miscPerUnitWeight * miscQty;

      const existingMisc = dest.get(miscKey);
      if (existingMisc) {
        existingMisc.qty += miscQty;
        existingMisc.weight += miscRowWeight;
        existingMisc.entries.push(itemNumber);
        existingMisc.entryIds.push(entry.id);
      } else {
        dest.set(miscKey, {
          description: enrichedMiscDescription,
          qty: miscQty,
          unit: miscUnit,
          weight: miscRowWeight,
          entries: [itemNumber],
          entryIds: [entry.id],
          material: mat,
        });
      }
    } else if (entry.itemType === "tank_chute") {
      // Fabricated tanks / chutes / hoppers / vessels / distributors. They
      // have no nominal bore, so they MUST be caught here — otherwise they
      // fall into the straight-pipe branch below (which defaults NB to 100)
      // and the tank is silently absorbed into a "100NB Steel Pipe" line.
      // Each tank is expanded into its plate parts (mark · thickness · qty ·
      // per-part weight) plus a summary line carrying the steel grade and a
      // stated-vs-computed mass cross-check.
      const rawEntrySpecsTank = entry.specs;
      const rawSpecsTank = rawEntrySpecsTank || {};
      const rawEntryDescriptionTank = entry.description;
      const tankName = rawEntryDescriptionTank || "Fabricated assembly";
      const rawSpecsQuantityValueTank = rawSpecsTank.quantityValue;
      const tankQty = rawSpecsQuantityValueTank || qty || 1;
      const rawSpecsUnitTank = rawSpecsTank.unit;
      const tankUnit = rawSpecsUnitTank ? String(rawSpecsUnitTank) : "Each";
      const rawTankGrade = rawSpecsTank.materialGrade;
      const tankGrade = rawTankGrade ? String(rawTankGrade) : "";
      const rawTankStatedMass = rawSpecsTank.totalSteelWeightKg;
      const statedSteelMassKg = isNumber(rawTankStatedMass) ? rawTankStatedMass : null;
      const rawPlateBom = rawSpecsTank.plateBom;
      const plates: PlatePart[] = isArray(rawPlateBom) ? (rawPlateBom as PlatePart[]) : [];

      // Plate / weld take-off + stated-vs-computed mass cross-check — the maths
      // is the canonical, unit-tested boq/tankTakeoff module.
      const plateTakeoff = tankPlateTakeoff(plates, tankQty);
      const computedSteelMassKg = plateTakeoff.computedSteelMassKg;
      const plateRows = plateTakeoff.rows.map((row, idx) => {
        const rowMark = row.mark;
        const rowDescription = row.description;
        const rowThicknessMm = row.thicknessMm;
        const markLabel = rowMark ? `Mark ${rowMark}` : `Part ${idx + 1}`;
        const plateDesc = rowDescription || "Plate part";
        const thkLabel = rowThicknessMm > 0 ? ` · ${rowThicknessMm}mm PL` : " · thickness TBC";
        return {
          key: `TANKPLATE_${tankName}_${rowMark || idx}_${rowThicknessMm}`,
          description: `    ↳ [${tankName}] ${markLabel}: ${plateDesc}${thkLabel}`,
          qty: row.qty,
          weight: row.weightKg,
        };
      });

      // Weld take-off (size from the drawing's stated fillet, else AISC min;
      // length a geometry estimate) — canonical boq/tankTakeoff module.
      const weld = weldTakeoff(plates, rawSpecsTank, tankQty);
      const weldLengthM = weld.lengthM;
      const weldWeightKg = weld.weightKg;
      const weldFilletLegMm = weld.legMm;
      const weldSizeSource = weld.legSource;

      const headerWeight =
        statedSteelMassKg !== null ? statedSteelMassKg * tankQty : computedSteelMassKg;
      const massCheck = verifyTankMass(statedSteelMassKg, computedSteelMassKg, tankQty);
      const massComputedKg = massCheck.computedKg;
      const massStatedTotalKg = massCheck.statedTotalKg;
      const verifyNote =
        massCheck.status === "verified"
          ? ` · ✓ weight verified (parts ≈ ${Math.round(massComputedKg)}kg vs stated ${Math.round(massStatedTotalKg ?? 0)}kg)`
          : massCheck.status === "check"
            ? ` · ⚠ CHECK WEIGHT: parts ${Math.round(massComputedKg)}kg vs stated ${Math.round(massStatedTotalKg ?? 0)}kg`
            : "";
      // Surface the stated lining / coating m² on the tank header so the
      // supplier can price internal rubber lining (Int m²) and external paint
      // (Ext m²) — the drawing's notes block states both (e.g. rubber 6.45 m²,
      // paint 8.15 m²). Scaled by tank qty, matching the weight column.
      const rawTankLiningArea = rawSpecsTank.liningAreaM2;
      const rawTankCoatingArea = rawSpecsTank.coatingAreaM2;
      const tankLiningAreaM2 =
        isNumber(rawTankLiningArea) && rawTankLiningArea > 0 ? rawTankLiningArea * tankQty : 0;
      const tankCoatingAreaM2 =
        isNumber(rawTankCoatingArea) && rawTankCoatingArea > 0 ? rawTankCoatingArea * tankQty : 0;
      const gradeLabel = tankGrade ? ` — ${tankGrade}` : "";
      const headerKey = `TANK_${tankName.toLowerCase()}`;
      const existingHeader = consolidatedTanks.get(headerKey);
      if (existingHeader) {
        existingHeader.qty += tankQty;
        existingHeader.weight += headerWeight;
        existingHeader.entries.push(itemNumber);
        existingHeader.entryIds.push(entry.id);
        if (tankLiningAreaM2 > 0) {
          const rawExistingInt = existingHeader.intAreaM2;
          existingHeader.intAreaM2 = (rawExistingInt || 0) + tankLiningAreaM2;
        }
        if (tankCoatingAreaM2 > 0) {
          const rawExistingExt = existingHeader.extAreaM2;
          existingHeader.extAreaM2 = (rawExistingExt || 0) + tankCoatingAreaM2;
        }
      } else {
        consolidatedTanks.set(headerKey, {
          description: `${tankName}${gradeLabel}${verifyNote}`,
          qty: tankQty,
          unit: tankUnit,
          weight: headerWeight,
          entries: [itemNumber],
          entryIds: [entry.id],
          material: "steel",
          intAreaM2: tankLiningAreaM2 > 0 ? tankLiningAreaM2 : undefined,
          extAreaM2: tankCoatingAreaM2 > 0 ? tankCoatingAreaM2 : undefined,
        });
      }
      plateRows.forEach((row) => {
        const existingPlate = consolidatedTanks.get(row.key);
        if (existingPlate) {
          existingPlate.qty += row.qty;
          existingPlate.weight += row.weight;
          existingPlate.entries.push(itemNumber);
          existingPlate.entryIds.push(entry.id);
        } else {
          consolidatedTanks.set(row.key, {
            description: row.description,
            qty: row.qty,
            unit: "ea",
            weight: row.weight,
            entries: [itemNumber],
            entryIds: [entry.id],
            material: "steel",
          });
        }
      });
      if (weldLengthM > 0) {
        const weldKey = `TANKWELD_${tankName.toLowerCase()}`;
        const weldDescription = `    ↳ [${tankName}] Welding (estimate): ~${weldLengthM.toFixed(1)} m fillet @ ${weldFilletLegMm}mm leg (${weldSizeSource}) · ~${Math.round(weldWeightKg)} kg weld metal · geometry estimate — confirm on site`;
        const existingWeld = consolidatedTanks.get(weldKey);
        if (existingWeld) {
          existingWeld.weight += weldWeightKg;
          existingWeld.entries.push(itemNumber);
          existingWeld.entryIds.push(entry.id);
          existingWeld.description = weldDescription;
        } else {
          consolidatedTanks.set(weldKey, {
            description: weldDescription,
            qty: 1,
            unit: "lot",
            weight: weldWeightKg,
            entries: [itemNumber],
            entryIds: [entry.id],
            material: "steel",
          });
        }
      }
    } else {
      const rawNominalBoreMm2 = entry.specs?.nominalBoreMm;
      // STRAIGHT PIPE
      const nb = rawNominalBoreMm2 || 100;
      const rawScheduleNumber3 = entry.specs?.scheduleNumber;
      const schedule = rawScheduleNumber3 || "";
      const rawIndividualPipeLength = entry.specs?.individualPipeLength;
      const pipeLength = rawIndividualPipeLength || DEFAULT_PIPE_LENGTH_M;
      // Convert total-length quantities (e.g. Nix imports of "7823.9 m")
      // into a piece count using the pipe length we're offering. Round
      // up — you can't buy half a pipe. Items where the BOQ stated a
      // piece count directly leave qty untouched.
      const rawQuantityType = entry.specs?.quantityType;
      const piecesFromMetres =
        rawQuantityType === "total_length" && pipeLength > 0 ? Math.ceil(qty / pipeLength) : qty;
      const rawCalculatedPipeCount = entry.calculation?.calculatedPipeCount;
      const pipeQty = rawCalculatedPipeCount || piecesFromMetres;

      // Product-type-aware key + description so HDPE/PVC pipes don't
      // accidentally consolidate with steel rows of the same NB. The
      // fallback weight kicks in for any entry where Step-2 auto-calc
      // hasn't run — typical for Nix-extracted items.
      const rawEntryMaterialType = entry.materialType;
      const materialType = rawEntryMaterialType || "steel";
      const rawHdpeGrade = globalSpecs?.hdpeGrade;
      const rawHdpeSdr = globalSpecs?.hdpeSdr;
      const sdrNumber = rawHdpeSdr ? Number(rawHdpeSdr) : undefined;
      const rawHdpePressureRating = globalSpecs?.hdpePressureRating;
      const rawPvcType = globalSpecs?.pvcType;
      const rawPvcPressureClass = globalSpecs?.pvcPressureClass;
      const pressureClassLabel =
        materialType === "hdpe" ? rawHdpePressureRating : rawPvcPressureClass?.toString();

      // Inspect the source description for variant keywords
      // (perforated / slotted / solid) so two 250 mm HDPE pipes
      // with the same NB / SDR / PN don't consolidate into one row
      // just because one is drilled and the other is a closed wall.
      const pipeVariant = detectPipeVariant(entry.description);
      const variantKeyPart = pipeVariant ?? "";
      const variantPrefix = pipeVariantPrefix(pipeVariant);
      const key = `PIPE_${materialType}_${nb}_${schedule}_${steelSpec}_${pipeLength}_${variantKeyPart}`;
      const existing = consolidatedPipes.get(key);
      const pipeWeight = fallbackPipeWeight(entry, nb, pipeLength, pipeQty, globalHdpeSdr);

      const rawPipeEndConfiguration2 = entry.specs?.pipeEndConfiguration;

      // Calculate weld lengths from entry calculation
      const pipeEndConfig = rawPipeEndConfiguration2 || "PE";
      const rawTotalFlangeWeldLength = entry.calculation?.totalFlangeWeldLength;
      const flangeWeldLength = rawTotalFlangeWeldLength || 0;
      const rawPipeWeldsPerUnit = entry.calculation?.pipeWeldsPerUnit;
      // For HDPE pipes the steel-only calc service never sets
      // pipeWeldsPerUnit. Fall back to "1 butt-fusion weld per pipe
      // segment" — counts the joint between this pipe and the next
      // run-of-pipe item. Steel keeps the original behaviour because
      // its calc service populates pipeWeldsPerUnit explicitly.
      const pipeWeldCount = rawPipeWeldsPerUnit || (materialType === "hdpe" ? 1 : 0);
      const rawOutsideDiameterMm3 = entry.calculation?.outsideDiameterMm;
      const rawWallThicknessMm3 = entry.calculation?.wallThicknessMm;
      const hdpePipeDims =
        materialType === "hdpe" && (!rawOutsideDiameterMm3 || !rawWallThicknessMm3)
          ? resolveHdpeDims(nb, entry, globalHdpeSdr, globalHdpePressureRating)
          : null;
      const hdpePipeDimsOd = hdpePipeDims ? hdpePipeDims.od : 0;
      const hdpePipeDimsWt = hdpePipeDims ? hdpePipeDims.wt : 0;
      // For Nix-extracted steel pipes the calculation block is empty, so OD
      // would be 0 and every area column blank. Resolve OD + wall from the
      // drawing's stated spec (explicit wall → plate → SANS 62 class →
      // assumed Sch 40) so weld length + Int/Ext m² populate.
      const steelPipeDims = materialType === "steel" ? resolveSteelPipeDims(nb, entry) : null;
      const steelPipeDimsOd = steelPipeDims ? steelPipeDims.od : 0;
      const steelPipeDimsWt = steelPipeDims ? steelPipeDims.wt : 0;
      const steelWallAssumed = steelPipeDims ? steelPipeDims.assumed : false;
      const od = rawOutsideDiameterMm3 || hdpePipeDimsOd || steelPipeDimsOd;
      // circumference per weld
      const pipeWeldLength = pipeWeldCount * pipeQty * ((Math.PI * od) / 1000);

      const rawCalculatedTotalLength = entry.calculation?.calculatedTotalLength;

      // Calculate surface areas
      const totalLength = rawCalculatedTotalLength || pipeLength * pipeQty;
      const wt = rawWallThicknessMm3 || hdpePipeDimsWt || steelPipeDimsWt;
      const wallAssumptionNote = steelWallAssumed ? " (wall assumed: Sch 40/STD)" : "";
      const odM = od / 1000;
      const idM = (od - 2 * wt) / 1000;
      const extAreaM2 = Math.PI * odM * totalLength;
      const intAreaM2 = Math.PI * idM * totalLength;

      // Build welds object
      const welds: Record<string, number> = {};
      if (pipeWeldLength > 0) welds["Pipe Weld"] = pipeWeldLength;
      if (flangeWeldLength > 0) welds["Flange Weld"] = flangeWeldLength;

      if (existing) {
        existing.qty += pipeQty;
        existing.weight += pipeWeight;
        existing.entries.push(itemNumber);
        existing.entryIds.push(entry.id);
        const rawPipeWeld = existing.welds?.["Pipe Weld"];
        // Accumulate welds and areas
        if (pipeWeldLength > 0)
          existing.welds = {
            ...existing.welds,
            "Pipe Weld": (rawPipeWeld || 0) + pipeWeldLength,
          };
        const rawFlangeWeld3 = existing.welds?.["Flange Weld"];
        if (flangeWeldLength > 0)
          existing.welds = {
            ...existing.welds,
            "Flange Weld": (rawFlangeWeld3 || 0) + flangeWeldLength,
          };
        const rawIntAreaM25 = existing.intAreaM2;
        existing.intAreaM2 = (rawIntAreaM25 || 0) + intAreaM2;
        const rawExtAreaM25 = existing.extAreaM2;
        existing.extAreaM2 = (rawExtAreaM25 || 0) + extAreaM2;
      } else {
        consolidatedPipes.set(key, {
          description:
            pipeRowDescription(
              entry,
              nb,
              schedule,
              pipeLength,
              steelSpec,
              rawHdpeGrade,
              sdrNumber,
              rawPvcType,
              pressureClassLabel,
              flangeSpec,
              globalHdpePressureRating,
              variantPrefix,
            ) + wallAssumptionNote,
          qty: pipeQty,
          unit: "Each",
          weight: pipeWeight,
          entries: [itemNumber],
          entryIds: [entry.id],
          material: materialOfEntry(entry),
          welds: keys(welds).length > 0 ? welds : undefined,
          intAreaM2: intAreaM2 > 0 ? intAreaM2 : undefined,
          extAreaM2: extAreaM2 > 0 ? extAreaM2 : undefined,
        });
      }

      // Flanges for pipes (using pipeEndConfig declared above)
      const flangeCount = getFlangeCountFromConfig(pipeEndConfig, "pipe");
      const pipeFlangeTypeName = getFlangeTypeName(pipeEndConfig);
      const rawFlangeStandardId4 = entry.specs?.flangeStandardId;
      const pipeFlangeStandardId = rawFlangeStandardId4 || globalSpecs?.flangeStandardId;
      const pipeFlangeStandardCode =
        pipeFlangeStandardId && masterData?.flangeStandards
          ? masterData.flangeStandards.find((s: any) => s.id === pipeFlangeStandardId)?.code
          : "";
      const rawFlangeTypeCode3 = entry.specs?.flangeTypeCode;
      const pipeFlangeTypeCode = rawFlangeTypeCode3 || globalSpecs?.flangeTypeCode;
      if (flangeCount.main > 0) {
        const flangeKey = `FLANGE_${nb}_${flangeSpec}_${pipeFlangeTypeName}`;
        const existingFlange = consolidatedFlanges.get(flangeKey);
        const flangeQty = flangeCount.main * pipeQty;
        const flangeWeightKg = flangeWeight(
          allWeights,
          nb,
          flangeSpec.split(" ").pop() || "PN16",
          pipeFlangeStandardCode ?? null,
          pipeFlangeTypeCode,
        );

        if (existingFlange) {
          existingFlange.qty += flangeQty;
          existingFlange.weight += flangeWeightKg * flangeQty;
          existingFlange.entries.push(itemNumber);
          existingFlange.entryIds.push(entry.id);
        } else {
          consolidatedFlanges.set(flangeKey, {
            description: `${nb}NB ${pipeFlangeTypeName} Flange ${flangeSpec}`,
            qty: flangeQty,
            unit: "Each",
            weight: flangeWeightKg * flangeQty,
            entries: [itemNumber],
            entryIds: [entry.id],
          });
        }

        if (materialOfEntry(entry) === "hdpe") {
          addHdpeStubItem(
            nb,
            flangeSpec.split(" ").pop() || "",
            globalHdpeSdr,
            flangeQty,
            itemNumber,
            entry.id,
          );
        } else if (materialOfEntry(entry) === "pvc") {
          addPvcStubItem(
            nb,
            flangeSpec.split(" ").pop() || "",
            globalSpecs?.pvcType,
            flangeQty,
            itemNumber,
            entry.id,
          );
        }

        // BNW for pipe flanges - use bolt set count (2 same-sized ends = 1 bolt set)
        const bnwInfo = bnwSetInfo(allBnwSets, nb, flangeSpec.split(" ").pop() || "PN16");
        const bnwKey = `BNW_${bnwInfo.boltSize}_x${bnwInfo.holesPerFlange}_${nb}NB_${flangeSpec}`;
        const existingBnw = consolidatedBnwSets.get(bnwKey);
        const bnwWeight = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
        const pipeBoltSetQty = boltSetCountPerPipe(pipeEndConfig) * pipeQty;

        if (pipeBoltSetQty > 0) {
          if (existingBnw) {
            existingBnw.qty += pipeBoltSetQty;
            existingBnw.weight += bnwWeight * pipeBoltSetQty;
            existingBnw.entries.push(itemNumber);
            existingBnw.entryIds.push(entry.id);
          } else {
            consolidatedBnwSets.set(bnwKey, {
              description: `${bnwInfo.boltSize} BNW Set x${bnwInfo.holesPerFlange} for ${nb}NB ${flangeSpec}`,
              qty: pipeBoltSetQty,
              unit: "sets",
              weight: bnwWeight * pipeBoltSetQty,
              entries: [itemNumber],
              entryIds: [entry.id],
            });
          }
        }

        // Gaskets for pipe flanges
        if (globalSpecs?.gasketType) {
          const gasketKey = `GASKET_${globalSpecs.gasketType}_${nb}NB_${flangeSpec}`;
          const existingGasket = consolidatedGaskets.get(gasketKey);
          const gasketWeight = gasketWeightLookup(allGaskets, globalSpecs.gasketType, nb);

          if (existingGasket) {
            existingGasket.qty += flangeQty;
            existingGasket.weight += gasketWeight * flangeQty;
            existingGasket.entries.push(itemNumber);
            existingGasket.entryIds.push(entry.id);
          } else {
            consolidatedGaskets.set(gasketKey, {
              description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpec}`,
              qty: flangeQty,
              unit: "Each",
              weight: gasketWeight * flangeQty,
              entries: [itemNumber],
              entryIds: [entry.id],
            });
          }
        }
      }

      // Blank flanges
      if (entry.specs?.addBlankFlange && entry.specs?.blankFlangeCount > 0) {
        const rawBlankFlangeNominalBoreMm3 = entry.specs?.blankFlangeNominalBoreMm;
        const blankNb = rawBlankFlangeNominalBoreMm3 || nb;
        const blankFlangeKey = `BLANK_FLANGE_${blankNb}_${flangeSpec}`;
        const existingBlank = consolidatedBlankFlanges.get(blankFlangeKey);
        const blankQty = entry.specs.blankFlangeCount * pipeQty;
        const blankWeight =
          flangeWeight(
            allWeights,
            blankNb,
            flangeSpec.split(" ").pop() || "PN16",
            pipeFlangeStandardCode ?? null,
            pipeFlangeTypeCode,
          ) * 0.6;
        const blankSurfaceArea = blankFlangeSurfaceArea(FLANGE_OD, blankNb);
        const blankExtArea = blankSurfaceArea.external * blankQty;
        const blankIntArea = blankSurfaceArea.internal * blankQty;

        if (existingBlank) {
          existingBlank.qty += blankQty;
          existingBlank.weight += blankWeight * blankQty;
          const rawExtAreaM26 = existingBlank.extAreaM2;
          existingBlank.extAreaM2 = (rawExtAreaM26 || 0) + blankExtArea;
          const rawIntAreaM26 = existingBlank.intAreaM2;
          existingBlank.intAreaM2 = (rawIntAreaM26 || 0) + blankIntArea;
          existingBlank.entries.push(itemNumber);
          existingBlank.entryIds.push(entry.id);
        } else {
          consolidatedBlankFlanges.set(blankFlangeKey, {
            description: `${blankNb}NB Blank Flange ${flangeSpec}`,
            qty: blankQty,
            unit: "Each",
            weight: blankWeight * blankQty,
            entries: [itemNumber],
            entryIds: [entry.id],
            extAreaM2: blankExtArea,
            intAreaM2: blankIntArea,
          });
        }
      }
    }
  });

  // Calculate totals
  let totalWeight = 0;
  consolidatedPipes.forEach((item) => (totalWeight += item.weight));
  consolidatedBends.forEach((item) => (totalWeight += item.weight));
  consolidatedFittings.forEach((item) => (totalWeight += item.weight));
  consolidatedFlanges.forEach((item) => (totalWeight += item.weight));
  consolidatedBnwSets.forEach((item) => (totalWeight += item.weight));
  consolidatedGaskets.forEach((item) => (totalWeight += item.weight));
  consolidatedBlankFlanges.forEach((item) => (totalWeight += item.weight));

  // Dark mode background mapping for header rows
  const darkBgMap: Record<string, string> = {
    "bg-blue-50": "dark:bg-blue-900/30",
    "bg-purple-50": "dark:bg-purple-900/30",
    "bg-green-50": "dark:bg-green-900/30",
    "bg-cyan-50": "dark:bg-cyan-900/30",
    "bg-gray-50": "dark:bg-gray-800/50",
    "bg-orange-50": "dark:bg-orange-900/30",
    "bg-teal-50": "dark:bg-teal-900/30",
  };

  // Dark mode text color mapping
  const darkTextMap: Record<string, string> = {
    "text-blue-700": "dark:text-blue-300",
    "text-purple-700": "dark:text-purple-300",
    "text-green-700": "dark:text-green-300",
    "text-cyan-700": "dark:text-cyan-300",
    "text-gray-700": "dark:text-gray-300",
    "text-orange-700": "dark:text-orange-300",
    "text-teal-700": "dark:text-teal-300",
  };

  // Filter a consolidated map to only items tagged with the given
  // material. Untagged items are skipped — flanges/BNW/gaskets always
  // sit in the Steel section in v1.1.35; v1.1.36 will introduce
  // proper HDPE-stub-end + steel-backing-flange line items so they
  // route correctly per supplier.

  // Helper that decides whether to render a consolidated section
  // table only if it has any rows, then forwards to the existing
  // renderer. Trims the JSX clutter from the material-grouped
  // layout below.
  const maybeRenderTable = (
    title: string,
    map: Map<string, ConsolidatedItem>,
    bgColor: string,
    textColor: string,
    showWeldColumns: boolean = false,
    showAreaColumns: boolean = false,
  ): React.ReactNode => {
    if (map.size === 0) return null;
    return renderConsolidatedTable(
      title,
      map,
      bgColor,
      textColor,
      showWeldColumns,
      showAreaColumns,
    );
  };

  const boqSourceContext = useMemo(
    () => ({ hasAnySourceLocations, sourceLookup }),
    [hasAnySourceLocations, sourceLookup],
  );

  // Trigger download of `data` as `filename` with the given MIME
  // type. Browser Blob + ObjectURL pattern.
  // Per-section exporters. The section name is used both as the
  // filename stem (via safeFilename) and the sheet name in xlsx.

  // Group exporter — bundles every sub-section of a material/category
  // group into a single download. Excel uses one workbook with a
  // sheet per sub-section. CSV concatenates with section headers and
  // blank-line separators. PDF/Word emit one HTML document with each
  // sub-section as an h2 + table.
  const exportGroup = useCallback(
    (format: ExportFormat, groupName: string, subsections: ExportableSubsection[]) => {
      const populated = subsections.filter((s) => s.items.size > 0);
      if (populated.length === 0) return;
      const stem = safeFilename(groupName);

      if (format === "excel") {
        const workbook = XLSX.utils.book_new();
        populated.forEach((sub) => {
          const rows = consolidatedToRows(
            sub.items,
            sub.showWeldColumns,
            sub.showAreaColumns,
            boqSourceContext,
          );
          if (rows.length === 0) return;
          const sheet = XLSX.utils.json_to_sheet(rows);
          // Sheet names capped at 31 chars by Excel — strip illegal
          // chars too (\, /, ?, *, [, ]).
          const sheetName = sub.title.replace(/[\\/?*[\]:]/g, "-").substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
        });
        XLSX.writeFile(workbook, `${stem}.xlsx`);
        return;
      }

      if (format === "csv") {
        const escapeCell = (v: string | number) => {
          const s = String(v ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const blocks = populated.map((sub) => {
          const rows = consolidatedToRows(
            sub.items,
            sub.showWeldColumns,
            sub.showAreaColumns,
            boqSourceContext,
          );
          if (rows.length === 0) return "";
          const headers = keys(rows[0]);
          const lines = [
            `# ${sub.title}`,
            headers.join(","),
            ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
          ];
          return lines.join("\n");
        });
        const csv = blocks.filter((b) => b.length > 0).join("\n\n");
        triggerDownload(csv, `${stem}.csv`, "text/csv;charset=utf-8");
        return;
      }

      // PDF + Word both serialise to HTML — PDF opens a print window
      // so the customer's browser handles the rendering; Word saves a
      // .doc file that Word opens directly.
      const sectionsHtml = populated
        .map((sub) => {
          const rows = consolidatedToRows(
            sub.items,
            sub.showWeldColumns,
            sub.showAreaColumns,
            boqSourceContext,
          );
          if (rows.length === 0) return "";
          const headers = keys(rows[0]);
          const tableRows = rows
            .map(
              (r) =>
                `<tr>${headers
                  .map((h) => `<td style="border:1px solid #ccc;padding:4px 6px;">${r[h]}</td>`)
                  .join("")}</tr>`,
            )
            .join("");
          const headerRow = `<tr>${headers.map((h) => `<th style="border:1px solid #ccc;padding:6px 8px;background:#f3f4f6;text-align:left;">${h}</th>`).join("")}</tr>`;
          return `<h2 style="margin-top:24px">${sub.title}</h2><table style="border-collapse:collapse;width:100%;margin-bottom:16px">${headerRow}${tableRows}</table>`;
        })
        .join("");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${groupName}</title></head><body style="font-family:sans-serif;font-size:12px"><h1>${groupName}</h1>${sectionsHtml}</body></html>`;

      if (format === "word") {
        triggerDownload(html, `${stem}.doc`, "application/msword");
        return;
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    },
    [boqSourceContext],
  );

  // Render consolidated BOQ table with consistent columns
  const renderConsolidatedTable = (
    title: string,
    items: Map<string, ConsolidatedItem>,
    bgColor: string,
    textColor: string,
    showWeldColumns: boolean = false,
    showAreaColumns: boolean = false,
  ) => {
    if (items.size === 0) return null;

    const itemsArray = Array.from(items.values());
    const sectionWeight = itemsArray.reduce((sum, item) => sum + item.weight, 0);
    const sectionTotalQty = itemsArray.reduce((sum, item) => sum + item.qty, 0);

    // Collect all unique weld types across items
    const allWeldTypes = new Set<string>();
    if (showWeldColumns) {
      itemsArray.forEach((item) => {
        if (item.welds) {
          keys(item.welds).forEach((wt) => allWeldTypes.add(wt));
        }
      });
    }
    const weldTypesList = Array.from(allWeldTypes);

    // Check if any items have area data
    const hasAreaData =
      showAreaColumns &&
      itemsArray.some(
        (item) => (item.intAreaM2 && item.intAreaM2 > 0) || (item.extAreaM2 && item.extAreaM2 > 0),
      );

    const rawBgColor = darkBgMap[bgColor];

    // Get dark mode variants
    const darkBg = rawBgColor || "dark:bg-gray-800/50";
    const rawTextColor = darkTextMap[textColor];
    const darkText = rawTextColor || "dark:text-gray-300";

    return (
      <div className="mb-6">
        <h4
          className={`text-md font-semibold ${textColor} ${darkText} mb-2 flex items-center justify-between`}
        >
          <span>
            {title} ({sectionTotalQty} total, {items.size} {items.size === 1 ? "type" : "types"})
          </span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            Section Weight: {formatWeight(sectionWeight)}
          </span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse table-fixed">
            <thead>
              <tr
                className={`${bgColor} ${darkBg} border-b-2 border-gray-300 dark:border-gray-600`}
              >
                <th
                  className={`text-left py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-20`}
                >
                  From
                </th>
                {hasAnySourceLocations && (
                  <th
                    className={`text-left py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-24`}
                    title={
                      "Source location in the uploaded BOQ document.\n" +
                      "Format: SheetName!Rn (e.g. HDPE ENQ 1!R62).\n" +
                      "Multiple rows are comma-separated when items consolidate.\n" +
                      "Note: the row refers to where Nix found the quantity line; " +
                      "the human-readable item description may sit on the row above it in SANS/SABS-style BOQs."
                    }
                  >
                    Source
                  </th>
                )}
                <th className={`text-center py-2 px-2 font-semibold ${textColor} ${darkText} w-10`}>
                  #
                </th>
                <th className={`text-left py-2 px-2 font-semibold ${textColor} ${darkText}`}>
                  Description
                </th>
                <th className={`text-center py-2 px-2 font-semibold ${textColor} ${darkText} w-14`}>
                  Qty
                </th>
                <th className={`text-center py-2 px-2 font-semibold ${textColor} ${darkText} w-14`}>
                  Unit
                </th>
                {showWeldColumns && (
                  <th
                    className={`text-right py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-20`}
                  >
                    Weld (m)
                  </th>
                )}
                {showAreaColumns && (
                  <>
                    <th
                      className={`text-right py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-16`}
                    >
                      Int m²
                    </th>
                    <th
                      className={`text-right py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-16`}
                    >
                      Ext m²
                    </th>
                  </>
                )}
                <th
                  className={`text-right py-2 px-2 font-semibold ${textColor} ${darkText} w-32 whitespace-nowrap`}
                >
                  Weight
                </th>
              </tr>
            </thead>
            <tbody>
              {itemsArray.map((item, idx) => {
                const totalWeld = item.welds
                  ? values(item.welds).reduce((sum, v) => sum + v, 0)
                  : 0;
                const rowBg = idx % 2 === 0 ? "bg-transparent" : "bg-gray-50 dark:bg-gray-800/30";
                const sourceLabelSet = new Set<string>();
                item.entryIds.forEach((id) => {
                  const label = sourceLookup.get(id);
                  if (label) sourceLabelSet.add(label);
                });
                const sourceLabels = Array.from(sourceLabelSet).join(", ");
                const sourceCell = sourceLabels || "—";
                return (
                  <tr
                    key={idx}
                    className={`border-b border-gray-200 dark:border-gray-700 ${rowBg} hover:bg-gray-100 dark:hover:bg-gray-700/50`}
                  >
                    <td
                      className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400 truncate"
                      title={item.entries.join(", ")}
                    >
                      {item.entries.join(", ")}
                    </td>
                    {hasAnySourceLocations && (
                      <td
                        className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400 truncate font-mono"
                        title={sourceCell}
                      >
                        {sourceCell}
                      </td>
                    )}
                    <td className="py-2 px-2 text-center text-gray-900 dark:text-gray-100">
                      {idx + 1}
                    </td>
                    <td
                      className="py-2 px-2 text-gray-900 dark:text-gray-100 truncate"
                      title={item.description}
                    >
                      {item.description}
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatQty(item.qty)}
                    </td>
                    <td className="py-2 px-2 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.unit}
                    </td>
                    {showWeldColumns && (
                      <td className="py-2 px-2 text-right text-xs text-gray-700 dark:text-gray-300">
                        {totalWeld > 0 ? totalWeld.toFixed(1) : "-"}
                      </td>
                    )}
                    {showAreaColumns && (
                      <>
                        <td className="py-2 px-2 text-right text-xs text-gray-700 dark:text-gray-300">
                          {item.intAreaM2 ? item.intAreaM2.toFixed(2) : "-"}
                        </td>
                        <td className="py-2 px-2 text-right text-xs text-gray-700 dark:text-gray-300">
                          {item.extAreaM2 ? item.extAreaM2.toFixed(2) : "-"}
                        </td>
                      </>
                    )}
                    <td className="py-2 px-2 text-right text-gray-900 dark:text-gray-100 tabular-nums whitespace-nowrap">
                      {formatWeight(item.weight)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Excel Export function
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Helper to convert Map to array for Excel (for individual sheets)
    const mapToExcelData = (
      items: Map<string, ConsolidatedItem>,
      sectionName: string,
      includeWelds: boolean = false,
      includeAreas: boolean = false,
    ) => {
      const data: any[] = [];
      let rowNum = 1;

      // Collect all weld types if needed
      const allWeldTypes = new Set<string>();
      if (includeWelds) {
        Array.from(items.values()).forEach((item) => {
          if (item.welds) {
            keys(item.welds).forEach((wt) => allWeldTypes.add(wt));
          }
        });
      }
      const weldTypesList = Array.from(allWeldTypes);

      Array.from(items.values()).forEach((item) => {
        const row: any = {
          "From Items": item.entries.join(", "),
          "#": rowNum++,
          Description: item.description,
          Qty: item.qty,
          Unit: item.unit,
        };

        // Add weld columns
        if (includeWelds) {
          weldTypesList.forEach((wt) => {
            row[`${wt} (m)`] = item.welds?.[wt]?.toFixed(2) || "";
          });
        }

        // Add area columns
        if (includeAreas) {
          row["Int m²"] = item.intAreaM2?.toFixed(2) || "";
          row["Ext m²"] = item.extAreaM2?.toFixed(2) || "";
        }

        row["Weight (kg)"] = item.weight.toFixed(2);
        data.push(row);
      });

      return data;
    };

    // Create combined BOQ sheet with all items
    const combinedData: any[] = [];
    let globalRowNum = 1;

    const addToCombined = (items: Map<string, ConsolidatedItem>, category: string) => {
      Array.from(items.values()).forEach((item) => {
        const totalWeld = item.welds ? values(item.welds).reduce((sum, v) => sum + v, 0) : 0;
        combinedData.push({
          "#": globalRowNum++,
          Category: category,
          Description: item.description,
          Qty: item.qty,
          Unit: item.unit,
          "Weld (m)": totalWeld > 0 ? totalWeld.toFixed(2) : "",
          "Int m²": item.intAreaM2?.toFixed(2) || "",
          "Ext m²": item.extAreaM2?.toFixed(2) || "",
          "Weight (kg)": item.weight.toFixed(2),
          "From Items": item.entries.join(", "),
        });
      });
    };

    // Add all categories to combined sheet
    addToCombined(consolidatedPipes, "Straight Pipes");
    addToCombined(consolidatedBends, "Bends");
    addToCombined(consolidatedFittings, "Fittings");
    addToCombined(consolidatedFlanges, "Flanges");
    addToCombined(consolidatedBlankFlanges, "Blank Flanges");
    addToCombined(consolidatedBnwSets, "BNW Sets");
    addToCombined(consolidatedGaskets, "Gaskets");
    addToCombined(consolidatedHdpeOther, "HDPE Other");
    addToCombined(consolidatedHdpeStubs, "HDPE Stub Ends");
    addToCombined(consolidatedPvcStubs, "PVC Stub-flange Adapters");
    addToCombined(consolidatedSteelOther, "Steel Other");
    addToCombined(consolidatedPvcOther, "PVC Other");
    addToCombined(consolidatedValves, "Valves");
    addToCombined(consolidatedTanks, "Tanks, Chutes & Vessels");
    addToCombined(consolidatedFasteners, "Fasteners");
    addToCombined(consolidatedUnidentified, "Unidentified");

    // Add Combined BOQ as first sheet
    if (combinedData.length > 0) {
      const combinedWs = XLSX.utils.json_to_sheet(combinedData);
      XLSX.utils.book_append_sheet(workbook, combinedWs, "Combined BOQ");
    }

    // Add sheets for each category
    if (consolidatedPipes.size > 0) {
      const pipesData = mapToExcelData(consolidatedPipes, "Straight Pipes", true, true);
      const ws = XLSX.utils.json_to_sheet(pipesData);
      XLSX.utils.book_append_sheet(workbook, ws, "Straight Pipes");
    }

    if (consolidatedBends.size > 0) {
      const bendsData = mapToExcelData(consolidatedBends, "Bends", true, true);
      const ws = XLSX.utils.json_to_sheet(bendsData);
      XLSX.utils.book_append_sheet(workbook, ws, "Bends");
    }

    if (consolidatedFittings.size > 0) {
      const fittingsData = mapToExcelData(consolidatedFittings, "Fittings", true, true);
      const ws = XLSX.utils.json_to_sheet(fittingsData);
      XLSX.utils.book_append_sheet(workbook, ws, "Fittings");
    }

    if (consolidatedFlanges.size > 0) {
      const flangesData = mapToExcelData(consolidatedFlanges, "Flanges");
      const ws = XLSX.utils.json_to_sheet(flangesData);
      XLSX.utils.book_append_sheet(workbook, ws, "Flanges");
    }

    if (consolidatedBlankFlanges.size > 0) {
      const blankFlangesData = mapToExcelData(
        consolidatedBlankFlanges,
        "Blank Flanges",
        false,
        true,
      );
      const ws = XLSX.utils.json_to_sheet(blankFlangesData);
      XLSX.utils.book_append_sheet(workbook, ws, "Blank Flanges");
    }

    if (consolidatedBnwSets.size > 0) {
      const bnwData = mapToExcelData(consolidatedBnwSets, "BNW Sets");
      const ws = XLSX.utils.json_to_sheet(bnwData);
      XLSX.utils.book_append_sheet(workbook, ws, "BNW Sets");
    }

    if (consolidatedGaskets.size > 0) {
      const gasketsData = mapToExcelData(consolidatedGaskets, "Gaskets");
      const ws = XLSX.utils.json_to_sheet(gasketsData);
      XLSX.utils.book_append_sheet(workbook, ws, "Gaskets");
    }

    // Calculate total quantities for summary
    const totalPipeQty = Array.from(consolidatedPipes.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalBendQty = Array.from(consolidatedBends.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalFittingQty = Array.from(consolidatedFittings.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalFlangeQty = Array.from(consolidatedFlanges.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalBlankFlangeQty = Array.from(consolidatedBlankFlanges.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalBnwSetQty = Array.from(consolidatedBnwSets.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalGasketQty = Array.from(consolidatedGaskets.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );

    const rawProjectName = rfqData.projectName;
    const rawCustomerName = rfqData.customerName;

    // Add a summary sheet
    const summaryData = [
      { Category: "Project", Value: rawProjectName || "Untitled" },
      { Category: "Customer", Value: rawCustomerName || "-" },
      { Category: "Total Items", Value: entries.length },
      { Category: "Total Estimated Weight (kg)", Value: totalWeight.toFixed(2) },
      { Category: "", Value: "" },
      { Category: "Section", Value: "Total Qty" },
      { Category: "Straight Pipes", Value: totalPipeQty },
      { Category: "Bends", Value: totalBendQty },
      { Category: "Fittings", Value: totalFittingQty },
      { Category: "Flanges", Value: totalFlangeQty },
      { Category: "Blank Flanges", Value: totalBlankFlangeQty },
      { Category: "BNW Sets", Value: totalBnwSetQty },
      { Category: "Gaskets", Value: totalGasketQty },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWs, "Summary");

    const rawProjectName2 = rfqData.projectName;

    // Generate filename with project name and date
    const projectName = (rawProjectName2 || "BOQ").replace(/[^a-zA-Z0-9]/g, "_");
    const dateStr = nowISO().split("T")[0];
    const filename = `${projectName}_BOQ_${dateStr}.xlsx`;

    // Write and download
    XLSX.writeFile(workbook, filename);
  };

  const rawProjectName3 = rfqData.projectName;
  const rawCustomerName2 = rfqData.customerName;
  const rawGasketType = globalSpecs?.gasketType;

  return {
    consolidatedBends,
    consolidatedBlankFlanges,
    consolidatedBnwSets,
    consolidatedFasteners,
    consolidatedFittings,
    consolidatedFlanges,
    consolidatedGaskets,
    consolidatedHdpeOther,
    consolidatedHdpeStubs,
    consolidatedPipes,
    consolidatedPvcOther,
    consolidatedPvcStubs,
    consolidatedSteelOther,
    consolidatedTanks,
    consolidatedUnidentified,
    consolidatedValves,
    entries,
    exportGroup,
    exportToExcel,
    globalSpecs,
    isUnregisteredCustomer,
    loading,
    masterData,
    maybeRenderTable,
    omittedEntries,
    rawCustomerName2,
    rawGasketType,
    rawProjectName3,
    renderConsolidatedTable,
    requiredProducts,
    restrictionPopup,
    setRestrictionPopup,
    showRestrictionPopup,
    totalWeight,
  };
}
