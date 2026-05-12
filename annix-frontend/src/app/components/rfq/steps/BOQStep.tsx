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
import { isString, keys, values } from "es-toolkit/compat";
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
  fallbackPipeWeight,
  resolveHdpeDims,
  resolveHdpePn,
} from "./boq/calc";
import { GroupExportsButtons } from "./boq/components/GroupExportsButtons";
import { pipeRowDescription } from "./boq/description";
import {
  bendCenterToFaceMm,
  consolidatedToRows,
  detectPipeVariant,
  filterByMaterial,
  flangeConfigSuffix,
  formatQty,
  formatWeight,
  getFlangeCountFromConfig,
  getFlangeTypeName,
  materialOfEntry,
  pipeVariantPrefix,
  safeFilename,
  triggerDownload,
} from "./boq/helpers";
import { getFlangeSpec, getSteelSpecName } from "./boq/spec";
import type {
  ConsolidatedItem,
  ExportableSubsection,
  ExportFormat,
  MaterialKey,
} from "./boq/types";

export default function BOQStep(props: {
  onPrevStep?: () => void;
  onSubmit?: () => void;
  onResubmit?: () => void;
  isEditing?: boolean;
  // True when the customer chose Skip on the clarifications step.
  // Drives the warning banner styling — amber when skipped (we
  // told the customer the items are missing and they pressed on
  // anyway), neutral when the customer hasn't yet visited Step 5
  // (jumped here via the step pill).
  clarificationsSkipped?: boolean;
}) {
  const { onPrevStep, onSubmit, onResubmit, isEditing, clarificationsSkipped } = props;
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
  // Process each entry
  entries.forEach((entry) => {
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
      const isFastenerDescription =
        rawSpecsNixItemType === "consumable" ||
        /\b(bolt|nut|washer|stud|gasket|fastener|jointing\s*ring)s?\b/i.test(miscDescription);

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

      const existingMisc = dest.get(miscKey);
      if (existingMisc) {
        existingMisc.qty += miscQty;
        existingMisc.entries.push(itemNumber);
        existingMisc.entryIds.push(entry.id);
      } else {
        dest.set(miscKey, {
          description: enrichedMiscDescription,
          qty: miscQty,
          unit: miscUnit,
          weight: 0,
          entries: [itemNumber],
          entryIds: [entry.id],
          material: mat,
        });
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
      const od = rawOutsideDiameterMm3 || hdpePipeDimsOd;
      // circumference per weld
      const pipeWeldLength = pipeWeldCount * pipeQty * ((Math.PI * od) / 1000);

      const rawCalculatedTotalLength = entry.calculation?.calculatedTotalLength;

      // Calculate surface areas
      const totalLength = rawCalculatedTotalLength || pipeLength * pipeQty;
      const wt = rawWallThicknessMm3 || hdpePipeDimsWt;
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
          description: pipeRowDescription(
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
          ),
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

  const boqSourceContext = { hasAnySourceLocations, sourceLookup };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bill of Quantities (BOQ)</h2>
            <p className="text-gray-600">
              Consolidated Material Requirements - Similar items pooled together
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Project</p>
            <p className="text-xl font-bold text-blue-600">{rawProjectName3 || "Untitled"}</p>
          </div>
        </div>
      </div>
      {/* Project Info Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div>
            <p className="text-gray-500 font-medium">Customer</p>
            <p className="text-gray-900">{rawCustomerName2 || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Steel Spec</p>
            <p className="font-medium">
              {(() => {
                // Get effective steel spec for each item (item override or global fallback)
                const getEffectiveSteelSpecId = (entry: any) => {
                  const rawSteelSpecificationId2 = entry.specs?.steelSpecificationId;
                  const rawSteelSpecificationId3 = entry.specs?.steelSpecificationId;
                  return rawSteelSpecificationId3 || globalSpecs?.steelSpecificationId;
                };
                const effectiveSpecs = entries
                  .map((entry: any) => getEffectiveSteelSpecId(entry))
                  .filter(Boolean);

                // If no specs from entries, try global directly
                if (effectiveSpecs.length === 0) {
                  if (globalSpecs?.steelSpecificationId) {
                    const rawSteelSpecName2 = masterData?.steelSpecs?.find(
                      (s: any) => s.id === globalSpecs.steelSpecificationId,
                    )?.steelSpecName;

                    return rawSteelSpecName2 || "-";
                  }
                  return "-";
                }

                const firstSpec = effectiveSpecs[0];
                const allSame = effectiveSpecs.every((id: number) => id === firstSpec);
                if (allSame) {
                  const rawSteelSpecName3 = masterData?.steelSpecs?.find(
                    (s: any) => s.id === firstSpec,
                  )?.steelSpecName;
                  return rawSteelSpecName3 || "-";
                }
                return "SEE IN ITEM";
              })()}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Flange Standard</p>
            <p className="text-gray-900">
              {(() => {
                // Get effective flange standard for each item
                const getEffectiveFlangeStdId = (entry: any) => {
                  const rawFlangeStandardId5 = entry.specs?.flangeStandardId;
                  const rawFlangeStandardId6 = entry.specs?.flangeStandardId;
                  return rawFlangeStandardId6 || globalSpecs?.flangeStandardId;
                };
                const getEffectivePressureClassId = (entry: any) => {
                  const rawFlangePressureClassId2 = entry.specs?.flangePressureClassId;
                  const rawFlangePressureClassId3 = entry.specs?.flangePressureClassId;
                  return rawFlangePressureClassId3 || globalSpecs?.flangePressureClassId;
                };
                const effectiveFlanges = entries
                  .map((entry: any) => ({
                    stdId: getEffectiveFlangeStdId(entry),
                    pcId: getEffectivePressureClassId(entry),
                  }))
                  .filter((f: any) => f.stdId);

                // If no specs from entries, try global directly
                if (effectiveFlanges.length === 0) {
                  if (globalSpecs?.flangeStandardId) {
                    const rawCode = masterData?.flangeStandards?.find(
                      (s: any) => s.id === globalSpecs.flangeStandardId,
                    )?.code;

                    const flangeCode = rawCode || "";

                    const rawDesignation = masterData?.pressureClasses?.find(
                      (p: any) => p.id === globalSpecs.flangePressureClassId,
                    )?.designation;

                    const pressureClass = globalSpecs?.flangePressureClassId
                      ? rawDesignation || ""
                      : "";
                    return (flangeCode + (pressureClass ? ` ${pressureClass}` : "")).trim() || "-";
                  }
                  return "-";
                }

                const firstFlange = effectiveFlanges[0];
                const allSame = effectiveFlanges.every(
                  (f: any) => f.stdId === firstFlange.stdId && f.pcId === firstFlange.pcId,
                );
                if (allSame) {
                  const rawCode2 = masterData?.flangeStandards?.find(
                    (s: any) => s.id === firstFlange.stdId,
                  )?.code;

                  const flangeCode = rawCode2 || "";

                  const rawDesignation2 = masterData?.pressureClasses?.find(
                    (p: any) => p.id === firstFlange.pcId,
                  )?.designation;

                  const pressureClass = rawDesignation2 || "";
                  return (flangeCode + (pressureClass ? ` ${pressureClass}` : "")).trim() || "-";
                }
                return "SEE IN ITEM";
              })()}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Bolts & Nuts</p>
            <p className="text-gray-900">ISO 4014/4032 Gr 8.8 HDG</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Gasket Type</p>
            <p className="text-gray-900">{rawGasketType || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Total Items</p>
            <p className="text-gray-900">{entries.length} line items</p>
          </div>
        </div>
      </div>
      {/* Consolidated BOQ Tables */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
          Consolidated Bill of Quantities
        </h3>

        {/* Items omitted — pending drawings. Surfaced at the top of
            the BOQ so the customer can see what's been skipped before
            scrolling through the supplier sections. The
            PreQuoteClarificationsStep upstream is what populated
            omittedItemIds; the warning banner shows when the
            customer chose Skip on that step rather than supplying
            the drawings. */}
        {omittedEntries.length > 0 && (
          <details
            className={`mb-6 border rounded-lg overflow-hidden group ${
              clarificationsSkipped
                ? "bg-amber-50 border-amber-300 dark:bg-amber-900/10 dark:border-amber-800"
                : "bg-gray-50 border-gray-300 dark:bg-gray-900/10 dark:border-gray-700"
            }`}
          >
            <summary className="flex items-start gap-2 p-4 cursor-pointer list-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <svg
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${clarificationsSkipped ? "text-amber-600 dark:text-amber-400" : "text-gray-600 dark:text-gray-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {omittedEntries.length} item{omittedEntries.length === 1 ? "" : "s"} omitted —
                  drawings not provided
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {clarificationsSkipped
                    ? "You skipped the clarification step. Pricing for these items will resume once the drawings arrive."
                    : "Pricing for these items will resume once the drawings arrive."}
                </p>
              </div>
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-500 dark:text-gray-400 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <ul className="px-4 pb-4 space-y-1 text-xs text-gray-700 dark:text-gray-300">
              {omittedEntries.map((entry) => {
                const rawClient = entry.clientItemNumber;
                const numberLabel = rawClient || entry.id;
                const rawDescription = entry.description;
                const descriptionText = rawDescription || "(no description)";
                return (
                  <li key={entry.id} className="flex gap-2 min-w-0">
                    <span className="font-medium font-mono text-gray-500 dark:text-gray-400 flex-shrink-0 w-16">
                      {numberLabel}
                    </span>
                    <span className="flex-1 min-w-0 truncate" title={descriptionText}>
                      {descriptionText}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        )}

        {/* HDPE group — pipes / bends / fittings / other tagged hdpe.
            Backing flanges + their bolts/gaskets stay in the Steel
            section for v1.1.35; v1.1.36 will introduce proper stub +
            backing-flange line items here. */}
        {(() => {
          const pipes = filterByMaterial(consolidatedPipes, "hdpe");
          const bends = filterByMaterial(consolidatedBends, "hdpe");
          const fittings = filterByMaterial(consolidatedFittings, "hdpe");
          const hasContent =
            pipes.size > 0 ||
            bends.size > 0 ||
            fittings.size > 0 ||
            consolidatedHdpeOther.size > 0 ||
            consolidatedHdpeStubs.size > 0;
          if (!hasContent) return null;
          // HDPE pipes/bends/fittings are bare polymer — never coated
          // or lined — so the Int/Ext m² columns are not relevant and
          // are suppressed. The HDPE-liner-inside-steel case is a
          // steel-section item (the steel may be coated) and is
          // handled by the Steel grouping.
          const subsections: ExportableSubsection[] = [
            { title: "HDPE Pipes", items: pipes, showWeldColumns: true, showAreaColumns: false },
            { title: "HDPE Bends", items: bends, showWeldColumns: true, showAreaColumns: false },
            {
              title: "HDPE Fittings (Tees, Laterals, Reducers)",
              items: fittings,
              showWeldColumns: true,
              showAreaColumns: false,
            },
            {
              title: "HDPE Stub Ends",
              items: consolidatedHdpeStubs,
              showWeldColumns: false,
              showAreaColumns: false,
            },
            {
              title: "HDPE Other",
              items: consolidatedHdpeOther,
              showWeldColumns: false,
              showAreaColumns: false,
            },
          ];
          return (
            <section className="mb-8 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="mb-3 pb-2 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-bold text-blue-900 dark:text-blue-200">
                  HDPE — supplier section
                </h3>
                <GroupExportsButtons
                  groupName="HDPE"
                  subsections={subsections}
                  onExport={exportGroup}
                />
              </div>
              {maybeRenderTable("HDPE Pipes", pipes, "bg-blue-50", "text-blue-700", true, false)}
              {maybeRenderTable("HDPE Bends", bends, "bg-blue-50", "text-blue-700", true, false)}
              {maybeRenderTable(
                "HDPE Fittings (Tees, Laterals, Reducers)",
                fittings,
                "bg-blue-50",
                "text-blue-700",
                true,
                false,
              )}
              {maybeRenderTable(
                "HDPE Stub Ends",
                consolidatedHdpeStubs,
                "bg-blue-50",
                "text-blue-700",
              )}
              {maybeRenderTable(
                "HDPE Other (End Caps, Puddle Pipes, Boots)",
                consolidatedHdpeOther,
                "bg-blue-50",
                "text-blue-700",
              )}
              <p className="mt-3 text-xs text-blue-900/80 dark:text-blue-200/80 italic leading-snug">
                <strong>HDPE assumptions:</strong> dimensions (OD, wall, weld length, surface area)
                derived from PE100 pipe spec for the line's PN rating, per SANS ISO 4427
                manufacturer data (Flo-Tek / Marley / Sinvac equivalent). Where end config is
                flanged, a stub end + SANS 1123 Type 1 (full-face) backing flange is assumed unless
                the tender document specifies an alternative. Final HDPE OD / wall thickness to be
                rationalised by the supplier at quote against the project pressure class. Values
                marked with <strong>*</strong> were not given by the source BOQ — laterals
                interpolated/extrapolated between catalogued anchor points (DN 200, 250, 315 from
                Strongbridge); reducer branch NBs inferred from the catalogue when the source only
                gave the main end. Supplier to confirm at quote.
              </p>
            </section>
          );
        })()}

        {/* Steel group — pipes / bends / fittings / flanges /
            blank-flanges / BNW / gaskets / other tagged steel. The
            flange-related sub-sections are not partitioned by
            material in v1.1.35 because they're physically steel
            components; HDPE backing-flange entries land here too. */}
        {(() => {
          const pipes = filterByMaterial(consolidatedPipes, "steel");
          const bends = filterByMaterial(consolidatedBends, "steel");
          const fittings = filterByMaterial(consolidatedFittings, "steel");
          const showFlangeAccessories =
            requiredProducts.includes("fasteners_gaskets") ||
            consolidatedFlanges.size > 0 ||
            consolidatedBlankFlanges.size > 0;
          const hasContent =
            pipes.size > 0 ||
            bends.size > 0 ||
            fittings.size > 0 ||
            consolidatedFlanges.size > 0 ||
            consolidatedBlankFlanges.size > 0 ||
            (showFlangeAccessories &&
              (consolidatedBnwSets.size > 0 || consolidatedGaskets.size > 0)) ||
            consolidatedSteelOther.size > 0;
          if (!hasContent) return null;
          const subsections: ExportableSubsection[] = [
            { title: "Steel Pipes", items: pipes, showWeldColumns: true, showAreaColumns: true },
            { title: "Steel Bends", items: bends, showWeldColumns: true, showAreaColumns: true },
            {
              title: "Steel Fittings (Tees, Laterals, Reducers)",
              items: fittings,
              showWeldColumns: true,
              showAreaColumns: true,
            },
            {
              title: "Flanges",
              items: consolidatedFlanges,
              showWeldColumns: false,
              showAreaColumns: false,
            },
            {
              title: "Blank Flanges",
              items: consolidatedBlankFlanges,
              showWeldColumns: false,
              showAreaColumns: true,
            },
            ...(showFlangeAccessories
              ? [
                  {
                    title: "Bolt, Nut & Washer Sets",
                    items: consolidatedBnwSets,
                    showWeldColumns: false,
                    showAreaColumns: false,
                  },
                  {
                    title: "Gaskets",
                    items: consolidatedGaskets,
                    showWeldColumns: false,
                    showAreaColumns: false,
                  },
                ]
              : []),
            {
              title: "Steel Other",
              items: consolidatedSteelOther,
              showWeldColumns: false,
              showAreaColumns: false,
            },
          ];
          return (
            <section className="mb-8 bg-slate-50/30 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="mb-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-200">
                  Steel — supplier section
                </h3>
                <GroupExportsButtons
                  groupName="Steel"
                  subsections={subsections}
                  onExport={exportGroup}
                />
              </div>
              {maybeRenderTable("Steel Pipes", pipes, "bg-slate-50", "text-slate-700", true, true)}
              {maybeRenderTable("Steel Bends", bends, "bg-slate-50", "text-slate-700", true, true)}
              {maybeRenderTable(
                "Steel Fittings (Tees, Laterals, Reducers)",
                fittings,
                "bg-slate-50",
                "text-slate-700",
                true,
                true,
              )}
              {maybeRenderTable("Flanges", consolidatedFlanges, "bg-cyan-50", "text-cyan-700")}
              {maybeRenderTable(
                "Blank Flanges",
                consolidatedBlankFlanges,
                "bg-gray-50",
                "text-gray-700",
                false,
                true,
              )}
              {showFlangeAccessories &&
                maybeRenderTable(
                  "Bolt, Nut & Washer Sets",
                  consolidatedBnwSets,
                  "bg-orange-50",
                  "text-orange-700",
                )}
              {showFlangeAccessories &&
                maybeRenderTable("Gaskets", consolidatedGaskets, "bg-teal-50", "text-teal-700")}
              {maybeRenderTable(
                "Steel Other",
                consolidatedSteelOther,
                "bg-slate-50",
                "text-slate-700",
              )}
            </section>
          );
        })()}

        {/* PVC / uPVC group — pipes / bends / fittings / stubs /
            couplings / other tagged pvc. Bare PVC is not coated or
            lined, so Int/Ext m² columns are suppressed (matches the
            HDPE convention v1.5.34). uPVC items land here too for
            now; a later version will split uPVC out as its own
            top-level group once the form supports a uPVC material
            type. */}
        {(() => {
          const pipes = filterByMaterial(consolidatedPipes, "pvc");
          const bends = filterByMaterial(consolidatedBends, "pvc");
          const fittings = filterByMaterial(consolidatedFittings, "pvc");
          const hasContent =
            pipes.size > 0 ||
            bends.size > 0 ||
            fittings.size > 0 ||
            consolidatedPvcOther.size > 0 ||
            consolidatedPvcStubs.size > 0;
          if (!hasContent) return null;
          const subsections: ExportableSubsection[] = [
            { title: "PVC Pipes", items: pipes, showWeldColumns: true, showAreaColumns: false },
            { title: "PVC Bends", items: bends, showWeldColumns: true, showAreaColumns: false },
            {
              title: "PVC Fittings",
              items: fittings,
              showWeldColumns: true,
              showAreaColumns: false,
            },
            {
              title: "PVC Stub-flange Adapters",
              items: consolidatedPvcStubs,
              showWeldColumns: false,
              showAreaColumns: false,
            },
            {
              title: "PVC Other",
              items: consolidatedPvcOther,
              showWeldColumns: false,
              showAreaColumns: false,
            },
          ];
          return (
            <section className="mb-8 bg-purple-50/30 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="mb-3 pb-2 border-b border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-bold text-purple-900 dark:text-purple-200">
                  PVC / uPVC — supplier section
                </h3>
                <GroupExportsButtons
                  groupName="PVC"
                  subsections={subsections}
                  onExport={exportGroup}
                />
              </div>
              {maybeRenderTable("PVC Pipes", pipes, "bg-purple-50", "text-purple-700", true, false)}
              {maybeRenderTable("PVC Bends", bends, "bg-purple-50", "text-purple-700", true, false)}
              {maybeRenderTable(
                "PVC Fittings",
                fittings,
                "bg-purple-50",
                "text-purple-700",
                true,
                false,
              )}
              {maybeRenderTable(
                "PVC Stub-flange Adapters",
                consolidatedPvcStubs,
                "bg-purple-50",
                "text-purple-700",
              )}
              {maybeRenderTable(
                "PVC Other",
                consolidatedPvcOther,
                "bg-purple-50",
                "text-purple-700",
              )}
            </section>
          );
        })()}

        {/* Cross-material groups — valves get their own table since
            a steel-bodied gate valve and an HDPE-flanged pinch valve
            ship from the same valve supplier category. Same for
            fasteners (bolts/nuts/gaskets that aren't tied to a
            specific pipeline material). Unidentified is the last
            stop for items where Nix could not infer a productType. */}
        {consolidatedValves.size > 0 && (
          <section className="mb-8 bg-rose-50/30 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
            <div className="mb-3 pb-2 border-b border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                Valves — supplier section
              </h3>
              <GroupExportsButtons
                groupName="Valves"
                subsections={[
                  {
                    title: "Valves",
                    items: consolidatedValves,
                    showWeldColumns: false,
                    showAreaColumns: false,
                  },
                ]}
                onExport={exportGroup}
              />
            </div>
            {renderConsolidatedTable("Valves", consolidatedValves, "bg-rose-50", "text-rose-700")}
          </section>
        )}

        {consolidatedFasteners.size > 0 && (
          <section className="mb-8 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="mb-3 pb-2 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                Bolts, Nuts &amp; Gaskets — supplier section
              </h3>
              <GroupExportsButtons
                groupName="Bolts, Nuts and Gaskets"
                subsections={[
                  {
                    title: "Fasteners (Bolts, Nuts, Gaskets)",
                    items: consolidatedFasteners,
                    showWeldColumns: false,
                    showAreaColumns: false,
                  },
                ]}
                onExport={exportGroup}
              />
            </div>
            {renderConsolidatedTable(
              "Fasteners (Bolts, Nuts, Gaskets)",
              consolidatedFasteners,
              "bg-amber-50",
              "text-amber-700",
            )}
          </section>
        )}

        {consolidatedUnidentified.size > 0 && (
          <section className="mb-8 bg-gray-50/30 dark:bg-gray-900/10 border border-gray-300 dark:border-gray-700 rounded-lg p-4">
            <div className="mb-3 pb-2 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-200">
                Unidentified — system could not classify these items
              </h3>
              <GroupExportsButtons
                groupName="Unidentified Items"
                subsections={[
                  {
                    title: "Unidentified Items",
                    items: consolidatedUnidentified,
                    showWeldColumns: false,
                    showAreaColumns: false,
                  },
                ]}
                onExport={exportGroup}
              />
            </div>
            {renderConsolidatedTable(
              "Unidentified Items",
              consolidatedUnidentified,
              "bg-gray-50",
              "text-gray-700",
            )}
          </section>
        )}

        {/* Total Weight Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-lg">
            <span className="font-semibold text-gray-700">Total Estimated Weight:</span>
            <span className="font-bold text-green-600">{formatWeight(totalWeight)}</span>
          </div>
        </div>
      </div>
      {/* Notes */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <p>
          <strong className="text-gray-700">Note:</strong> This BOQ consolidates similar items
          across all line items. The "From Items" column shows which original line items contribute
          to each consolidated entry. Weights are estimates based on standard dimensions.
        </p>
      </div>
      {/* Navigation & Actions */}
      <div className="flex justify-between items-center gap-4 pt-4 border-t border-gray-200">
        <div className="flex gap-4">
          {onPrevStep && (
            <button
              onClick={onPrevStep}
              disabled={loading}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors font-semibold disabled:opacity-50"
            >
              ← Back to Review
            </button>
          )}
        </div>
        <div className="flex gap-4">
          <button
            onClick={isUnregisteredCustomer ? showRestrictionPopup("export") : exportToExcel}
            className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              isUnregisteredCustomer
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export Excel
            {isUnregisteredCustomer && (
              <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <button
            onClick={isUnregisteredCustomer ? showRestrictionPopup("export") : () => window.print()}
            className={`px-6 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
              isUnregisteredCustomer
                ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print BOQ
            {isUnregisteredCustomer && (
              <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          {isEditing && onResubmit ? (
            <button
              onClick={onResubmit}
              disabled={loading}
              className="px-8 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Re-Submitting...
                </>
              ) : (
                <>
                  Re-Submit RFQ
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </>
              )}
            </button>
          ) : (
            onSubmit && (
              <button
                onClick={onSubmit}
                disabled={loading}
                className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit RFQ for Quotation
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </>
                )}
              </button>
            )
          )}
        </div>
      </div>
      {/* Restriction Popup for unregistered customers */}
      {restrictionPopup && (
        <div className="fixed inset-0 z-50" onClick={() => setRestrictionPopup(null)}>
          <div
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-xs"
            style={{
              left: Math.min(restrictionPopup.x, window.innerWidth - 320),
              top: Math.min(restrictionPopup.y, window.innerHeight - 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Export Feature Locked</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Export to Excel and Print BOQ are available for registered customers only.
                </p>
                <a
                  href="/customer/register"
                  className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Register for free →
                </a>
              </div>
            </div>
            <button
              onClick={() => setRestrictionPopup(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
