"use client";
import React, { useCallback } from "react";
import { rfqApi } from "@/app/lib/api/client";
import {
  DEFAULT_PIPE_LENGTH_M,
  closureWeight as getClosureWeight,
  fittingFlangeCounts as getFittingFlangeCounts,
  flangeCountPerBend as getFlangeCountPerBend,
  flangeCountPerFitting as getFlangeCountPerFitting,
  physicalFlangeCount as getPhysicalFlangeCount,
  tackWeldEndsPerBend as getTackWeldEndsPerBend,
  tackWeldWeight as getTackWeldWeight,
  STEEL_DENSITY_KG_M3,
  scheduleListForSpec,
} from "@/app/lib/config/rfq";
import { FlangeSpecData, fetchFlangeSpecsStatic } from "@/app/lib/hooks/useFlangeSpecs";
import type { BendEntry, FittingEntry } from "@/app/lib/hooks/useRfqForm";
import { log } from "@/app/lib/logger";
import { flangeWeight as flangeWeightLookup, hasFlangeWeightRecord } from "@/app/lib/query/hooks";
import type { RfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import {
  calculateLocalPipeResult,
  getPressureClassWithFlangeType,
  normalizeFittingTypeForApi,
} from "./local-pipe-calc";

type OrchestratorCalculationsDeps = Pick<
  RfqWizardStore,
  "masterData" | "totalWeight" | "updateEntryCalculation" | "updateItem" | "updateStraightPipeEntry"
> & {
  allWeights: any[];
  nbToOdMap: Record<number, number>;
  rfqDataRef: React.MutableRefObject<{ items: any[]; [key: string]: any }>;
};

export function useOrchestratorCalculations(deps: OrchestratorCalculationsDeps) {
  const {
    allWeights,
    masterData,
    nbToOdMap,
    rfqDataRef,
    totalWeight,
    updateEntryCalculation,
    updateItem,
    updateStraightPipeEntry,
  } = deps;

  const handleCalculateAll = useCallback(async () => {
    const currentRfqData = rfqDataRef.current;
    const currentGlobalSpecs = currentRfqData.globalSpecs;
    const currentGlobalWorkingPressureBar = currentGlobalSpecs?.workingPressureBar;
    const currentGlobalWorkingTemperatureC = currentGlobalSpecs?.workingTemperatureC;
    const currentGlobalSteelSpecificationId = currentGlobalSpecs?.steelSpecificationId;
    const currentGlobalFlangeStandardId = currentGlobalSpecs?.flangeStandardId;
    const currentGlobalFlangePressureClassId = currentGlobalSpecs?.flangePressureClassId;
    try {
      for (const entry of currentRfqData.straightPipeEntries) {
        try {
          const rawWorkingPressureBar2 = entry.specs.workingPressureBar;
          // Merge entry specs with global specs (same as auto-calculate)
          const workingPressureBar =
            rawWorkingPressureBar2 || currentGlobalWorkingPressureBar || 10;
          const rawWorkingTemperatureC2 = entry.specs.workingTemperatureC;
          const workingTemperatureC =
            rawWorkingTemperatureC2 || currentGlobalWorkingTemperatureC || 20;
          const rawSteelSpecificationId2 = entry.specs.steelSpecificationId;
          const steelSpecificationId =
            rawSteelSpecificationId2 || currentGlobalSteelSpecificationId || 2;
          const rawFlangeStandardId2 = entry.specs.flangeStandardId;
          const flangeStandardId = rawFlangeStandardId2 || currentGlobalFlangeStandardId || 1;
          const rawFlangePressureClassId2 = entry.specs.flangePressureClassId;
          const flangePressureClassId =
            rawFlangePressureClassId2 || currentGlobalFlangePressureClassId;

          const calculationData = {
            ...entry.specs,
            workingPressureBar,
            workingTemperatureC,
            steelSpecificationId,
            flangeStandardId,
            flangePressureClassId,
          };

          log.debug("🔄 Manual calculate for entry:", entry.id, calculationData);
          const result = await rfqApi.calculate(calculationData);
          log.debug("✅ Manual calculation result:", result);

          const rawFlangePressureClassId3 = entry.specs.flangePressureClassId;

          // Recalculate flange weight for accurate values, default to PN16
          // Combine with flange type code for SABS 1123 / BS 4504 standards
          const entryPressureClassId =
            rawFlangePressureClassId3 || currentRfqData.globalSpecs?.flangePressureClassId;

          const rawDesignation6 = masterData.pressureClasses?.find(
            (pc: { id: number; designation: string }) => pc.id === entryPressureClassId,
          )?.designation;

          const basePressureClassDesignation = rawDesignation6 || "PN16";
          const flangeStandardCode = masterData.flangeStandards?.find(
            (s: any) => s.id === flangeStandardId,
          )?.code;
          const rawFlangeTypeCode4 = entry.specs.flangeTypeCode;
          const flangeTypeCode = rawFlangeTypeCode4 || currentRfqData.globalSpecs?.flangeTypeCode;
          const pressureClassDesignation = getPressureClassWithFlangeType(
            basePressureClassDesignation,
            flangeTypeCode,
            flangeStandardCode,
          );

          const rawPipeEndConfiguration4 = entry.specs.pipeEndConfiguration;

          // Calculate number of flanges from pipe configuration if not in result
          const pipeEndConfig = rawPipeEndConfiguration4 || "PE";
          const physicalFlangesPerPipe = getPhysicalFlangeCount(pipeEndConfig);
          const rawCalculatedPipeCount2 = result?.calculatedPipeCount;
          const rawQuantityValue2 = entry.specs.quantityValue;
          const rawIndividualPipeLength2 = entry.specs.individualPipeLength;
          const calculatedPipeCount =
            rawCalculatedPipeCount2 ||
            Math.ceil(
              (rawQuantityValue2 || 1) / (rawIndividualPipeLength2 || DEFAULT_PIPE_LENGTH_M),
            );
          const rawNumberOfFlanges2 = result?.numberOfFlanges;
          // Puddle pipes: the backend counts the puddle plate as a generic
          // flange; its weight is priced separately from its dims, so use
          // the end-config count only or the plate gets double-charged at
          // the end-flange weight.
          const numberOfFlanges =
            entry.specs.pipeType === "puddle"
              ? physicalFlangesPerPipe * calculatedPipeCount
              : rawNumberOfFlanges2 || physicalFlangesPerPipe * calculatedPipeCount;

          if (result && numberOfFlanges > 0) {
            let flangeWeightPerUnit = flangeWeightLookup(
              allWeights,
              entry.specs.nominalBoreMm!,
              pressureClassDesignation,
              flangeStandardCode || null,
              flangeTypeCode || "",
            );
            let flangeSpecData: FlangeSpecData | null = null;

            if (flangeStandardId && flangePressureClassId && entry.specs.nominalBoreMm) {
              const flangeTypeId = flangeTypeCode
                ? masterData.flangeTypes?.find((ft: any) => ft.code === flangeTypeCode)?.id
                : undefined;
              flangeSpecData = await fetchFlangeSpecsStatic(
                entry.specs.nominalBoreMm,
                flangeStandardId,
                flangePressureClassId,
                flangeTypeId,
              );
              // The dimension table's mass_kg is type-agnostic; only use it
              // when the type-specific flange-weight table has no row, else
              // it overrides a correct /1-/8 weight with the wrong type's mass.
              if (
                flangeSpecData &&
                !hasFlangeWeightRecord(
                  allWeights,
                  entry.specs.nominalBoreMm!,
                  pressureClassDesignation,
                )
              ) {
                flangeWeightPerUnit = flangeSpecData.flangeMassKg;
                log.debug(
                  `🔧 Manual calc using dynamic flange specs: ${flangeWeightPerUnit}kg/flange`,
                );
              }
            }

            const totalFlangeWeight = numberOfFlanges * flangeWeightPerUnit;
            const rawTotalPipeWeight3 = result.totalPipeWeight;
            const totalSystemWeight = (rawTotalPipeWeight3 || 0) + totalFlangeWeight;

            log.debug(
              `🔧 Manual calc flange weight for ${pressureClassDesignation}: ${flangeWeightPerUnit}kg/flange × ${numberOfFlanges} = ${totalFlangeWeight}kg`,
            );

            updateEntryCalculation(entry.id, {
              ...result,
              numberOfFlanges,
              flangeWeightPerUnit,
              totalFlangeWeight,
              totalSystemWeight,
              pressureClassUsed: pressureClassDesignation,
              flangeSpecs: flangeSpecData,
            } as any);
          } else {
            const rawTotalPipeWeight4 = result.totalPipeWeight;
            // No flanges - totalSystemWeight is just pipe weight
            updateEntryCalculation(entry.id, {
              ...result,
              totalSystemWeight: rawTotalPipeWeight4 || 0,
              numberOfFlanges: 0,
              totalFlangeWeight: 0,
              flangeWeightPerUnit: 0,
            } as any);
          }
        } catch (error: any) {
          log.error(`Calculation error for entry ${entry.id}:`, error);
          const rawMessage = error.message;
          const errorMessage = rawMessage || String(error);

          // If API returns 404, use local calculation fallback
          if (
            errorMessage.includes("404") ||
            errorMessage.includes("not found") ||
            errorMessage.includes("not available")
          ) {
            log.debug("⚠️ API 404 - Using local calculation fallback for entry:", entry.id);
            const rawWallThicknessMm3 = entry.specs.wallThicknessMm;
            const wallThickness = rawWallThicknessMm3 || 6.35;

            const rawFlangePressureClassId4 = entry.specs.flangePressureClassId;

            // Get pressure class designation for accurate flange weights, default to PN16
            // Combine with flange type code for SABS 1123 / BS 4504 standards
            const entryPressureClassId =
              rawFlangePressureClassId4 || currentRfqData.globalSpecs?.flangePressureClassId;
            const rawFlangeStandardId3 = entry.specs.flangeStandardId;
            const entryFlangeStandardId =
              rawFlangeStandardId3 || currentRfqData.globalSpecs?.flangeStandardId;

            const rawDesignation7 = masterData.pressureClasses?.find(
              (pc: { id: number; designation: string }) => pc.id === entryPressureClassId,
            )?.designation;

            const basePressureClassDesignation = rawDesignation7 || "PN16";
            const flangeStandardCode = masterData.flangeStandards?.find(
              (s: any) => s.id === entryFlangeStandardId,
            )?.code;
            const rawFlangeTypeCode5 = entry.specs.flangeTypeCode;
            const flangeTypeCode = rawFlangeTypeCode5 || currentRfqData.globalSpecs?.flangeTypeCode;
            const pressureClassDesignation = getPressureClassWithFlangeType(
              basePressureClassDesignation,
              flangeTypeCode,
              flangeStandardCode,
            );

            const rawQuantityType3 = entry.specs.quantityType;
            const rawPipeEndConfiguration5 = entry.specs.pipeEndConfiguration;

            const localResult = calculateLocalPipeResult(
              nbToOdMap,
              allWeights,
              entry.specs.nominalBoreMm!,
              wallThickness,
              entry.specs.individualPipeLength!,
              entry.specs.quantityValue!,
              rawQuantityType3 || "number_of_pipes",
              rawPipeEndConfiguration5 || "PE",
              pressureClassDesignation,
              flangeStandardCode,
              flangeTypeCode,
            );
            log.debug("✅ Local calculation result:", localResult);
            updateEntryCalculation(entry.id, localResult);
          } else {
            const nb = entry.specs.nominalBoreMm;
            const schedule = entry.specs.scheduleNumber;
            const details = [nb ? `${nb}mm bore` : null, schedule ? `${schedule} schedule` : null]
              .filter(Boolean)
              .join(" with ");
            const capitalizedDetails = details
              ? details.charAt(0).toUpperCase() + details.slice(1)
              : null;
            const friendlyError = capitalizedDetails
              ? `**Pipe:** ${capitalizedDetails} is not available. Please try a different size or schedule.`
              : "**Pipe:** This combination is not available. Please try different specifications.";
            updateStraightPipeEntry(entry.id, { calculationError: friendlyError });
          }
        }
      }
    } catch (error: any) {
      const isNotFoundError =
        error?.message?.includes("404") || error?.message?.toLowerCase().includes("not found");
      if (!isNotFoundError) {
        log.error("Calculation error:", error);
      }
    }
  }, [
    masterData.pressureClasses,
    masterData.flangeStandards,
    masterData.flangeTypes,
    updateEntryCalculation,
    updateStraightPipeEntry,
  ]);

  const handleCalculateBend = useCallback(
    async (entryId: string) => {
      try {
        const entry = rfqDataRef.current.items.find(
          (e) => e.id === entryId && e.itemType === "bend",
        );
        if (!entry || entry.itemType !== "bend") return;

        const bendEntry = entry;
        const rawBendDegrees = bendEntry.specs?.bendDegrees;
        const bendDegrees = rawBendDegrees || 90;

        // API requires minimum 15° - for smaller angles, use local calculation
        if (bendDegrees < 15) {
          log.debug(
            `Bend angle ${bendDegrees}° is below API minimum (15°), using local calculation`,
          );

          const rawNominalBoreMm2 = bendEntry.specs?.nominalBoreMm;

          // Local calculation for small angle bends
          const nominalBoreMm = rawNominalBoreMm2 || 40;
          const rawScheduleNumber2 = bendEntry.specs?.scheduleNumber;
          const scheduleNumber = rawScheduleNumber2 || "40";
          const rawQuantityValue3 = bendEntry.specs?.quantityValue;
          const quantity = rawQuantityValue3 || 1;
          const rawCenterToFaceMm = bendEntry.specs?.centerToFaceMm;
          const centerToFace = rawCenterToFaceMm || 100;

          const rawSteelSpecificationId3 = bendEntry.specs?.steelSpecificationId;

          // Get wall thickness from fallback schedules - use correct schedule list based on steel spec
          const bendEffectiveSpecId =
            rawSteelSpecificationId3 || rfqDataRef.current.globalSpecs?.steelSpecificationId;
          const schedules = scheduleListForSpec(nominalBoreMm, bendEffectiveSpecId);
          const scheduleData = schedules.find((s: any) => s.scheduleDesignation === scheduleNumber);
          const rawWallThicknessMm4 = scheduleData?.wallThicknessMm;
          const wallThickness = rawWallThicknessMm4 || 6.35;

          const rawNominalBoreMm3 = nbToOdMap[nominalBoreMm];

          // Calculate OD from NB
          const od = rawNominalBoreMm3 || nominalBoreMm * 1.05;
          const id = od - 2 * wallThickness;

          // Estimate bend arc length based on angle and C/F
          const arcLength = (bendDegrees / 90) * (centerToFace * 2);

          // Weight calculation: π/4 × (OD² - ID²) × length × density (kg/m³ for steel)
          // mm²
          const crossSectionArea = (Math.PI / 4) * (od * od - id * id);
          const bendWeight =
            // kg
            (crossSectionArea / 1000000) * (arcLength / 1000) * STEEL_DENSITY_KG_M3;

          const totalWeight = bendWeight * quantity;

          updateItem(entryId, {
            calculation: {
              bendWeight: bendWeight,
              totalWeight: totalWeight,
              centerToFaceDimension: centerToFace,
              outsideDiameterMm: od,
              wallThicknessMm: wallThickness,
              calculatedLocally: true,
              note: `Local calculation for ${bendDegrees}° bend (API minimum is 15°)`,
            },
          });
          return;
        }

        const { bendRfqApi } = await import("@/app/lib/api/client");

        // Use item-level flange specs if set, otherwise use global
        const useGlobal = bendEntry.specs?.useGlobalFlangeSpecs !== false;
        const rawFlangeStandardId4 = bendEntry.specs?.flangeStandardId;
        const flangeStandardId = useGlobal
          ? rawFlangeStandardId4 || rfqDataRef.current.globalSpecs?.flangeStandardId
          : bendEntry.specs?.flangeStandardId;
        const rawFlangePressureClassId5 = bendEntry.specs?.flangePressureClassId;
        const flangePressureClassId = useGlobal
          ? rawFlangePressureClassId5 || rfqDataRef.current.globalSpecs?.flangePressureClassId
          : bendEntry.specs?.flangePressureClassId;

        const rawNominalBoreMm4 = bendEntry.specs?.nominalBoreMm;
        const rawScheduleNumber3 = bendEntry.specs?.scheduleNumber;
        const rawBendType = bendEntry.specs?.bendType;
        const rawQuantityValue4 = bendEntry.specs?.quantityValue;
        const rawNumberOfTangents = bendEntry.specs?.numberOfTangents;
        const rawTangentLengths = bendEntry.specs?.tangentLengths;
        const rawWorkingPressureBar3 = bendEntry.specs?.workingPressureBar;
        const rawWorkingTemperatureC3 = bendEntry.specs?.workingTemperatureC;
        const rawSteelSpecificationId4 = bendEntry.specs?.steelSpecificationId;
        const refGlobalSpecs = rfqDataRef.current.globalSpecs;
        const refWorkingPressureBar = refGlobalSpecs.workingPressureBar;
        const refWorkingTemperatureC = refGlobalSpecs.workingTemperatureC;
        const refSteelSpecificationId = refGlobalSpecs.steelSpecificationId;

        const calculationData = {
          nominalBoreMm: rawNominalBoreMm4 || 40,
          scheduleNumber: rawScheduleNumber3 || "40",
          bendDegrees: bendDegrees,
          bendType: rawBendType || "1.5D",
          quantityValue: rawQuantityValue4 || 1,
          quantityType: "number_of_items" as const,
          numberOfTangents: rawNumberOfTangents || 0,
          tangentLengths: rawTangentLengths || [],
          workingPressureBar: rawWorkingPressureBar3 || refWorkingPressureBar || 10,
          workingTemperatureC: rawWorkingTemperatureC3 || refWorkingTemperatureC || 20,
          steelSpecificationId: rawSteelSpecificationId4 || refSteelSpecificationId || 2,
          useGlobalFlangeSpecs: useGlobal,
          flangeStandardId,
          flangePressureClassId,
        };

        const result = await bendRfqApi.calculate(calculationData);

        // Fetch dynamic flange specs if available
        let flangeSpecData: FlangeSpecData | null = null;
        const nominalBoreMm = bendEntry.specs?.nominalBoreMm;
        if (flangeStandardId && flangePressureClassId && nominalBoreMm) {
          const rawFlangeTypeCode6 = bendEntry.specs?.flangeTypeCode;
          const flangeTypeCode = useGlobal
            ? rawFlangeTypeCode6 || rfqDataRef.current.globalSpecs?.flangeTypeCode
            : bendEntry.specs?.flangeTypeCode;
          const flangeTypeId = flangeTypeCode
            ? masterData.flangeTypes?.find((ft: any) => ft.code === flangeTypeCode)?.id
            : undefined;
          flangeSpecData = await fetchFlangeSpecsStatic(
            nominalBoreMm,
            flangeStandardId,
            flangePressureClassId,
            flangeTypeId,
          );
          if (flangeSpecData) {
            log.debug(
              `🔧 Bend using dynamic flange specs: ${flangeSpecData.flangeMassKg}kg/flange`,
            );
          }
        }

        // Price the flanges client-side — the engine's response carries no
        // flange weight, so bend line weights everywhere (summary table,
        // Review, BOQ) were bend-only while the calc card showed bend +
        // flanges. Store flangeWeight and fold it into totalWeight.
        const rawBendEndConfiguration7 = bendEntry.specs?.bendEndConfiguration;
        const bendEndConfigForFlanges = rawBendEndConfiguration7 || "PE";
        const isSweepTeeBendCalc = bendEntry.specs?.bendItemType === "SWEEP_TEE";
        const bendFlangeCount = isSweepTeeBendCalc
          ? getFlangeCountPerFitting(bendEndConfigForFlanges)
          : getFlangeCountPerBend(bendEndConfigForFlanges);
        let bendFlangeWeight = 0;
        let bendFlangePerUnit = 0;
        // Only price flanges when the weight table is loaded — an empty
        // array silently returns per-NB fallbacks (e.g. 80kg). Leaving
        // flangeWeight undefined marks the calc stale so the form's
        // mount-trigger re-runs it once data is ready.
        if (bendFlangeCount > 0 && nominalBoreMm && allWeights.length > 0) {
          const rawBendClassDesignation = masterData.pressureClasses?.find(
            (pc: any) => pc.id === flangePressureClassId,
          )?.designation;
          const bendClassDesignationBase = rawBendClassDesignation || "PN16";
          const bendStandardCode = masterData.flangeStandards?.find(
            (s: any) => s.id === flangeStandardId,
          )?.code;
          const rawBendFlangeTypeCode = bendEntry.specs?.flangeTypeCode;
          const bendFlangeTypeCode = useGlobal
            ? rawBendFlangeTypeCode || rfqDataRef.current.globalSpecs?.flangeTypeCode
            : rawBendFlangeTypeCode;
          const bendDesignation = getPressureClassWithFlangeType(
            bendClassDesignationBase,
            bendFlangeTypeCode,
            bendStandardCode,
          );
          bendFlangePerUnit = flangeWeightLookup(
            allWeights,
            nominalBoreMm,
            bendDesignation,
            bendStandardCode || null,
            bendFlangeTypeCode || "",
          );
          if (
            flangeSpecData &&
            !hasFlangeWeightRecord(allWeights, nominalBoreMm, bendDesignation)
          ) {
            bendFlangePerUnit = flangeSpecData.flangeMassKg;
          }
          bendFlangeWeight = bendFlangeCount * bendFlangePerUnit;
        }
        // Closure pieces and L/F tack welds are spec-driven extras the
        // engine doesn't price — include them so the stored total matches
        // the calc card.
        const rawClosureLengthMm2 = bendEntry.specs?.closureLengthMm;
        const bendClosureLengthMm = rawClosureLengthMm2 || 0;
        const rawResultWallThickness = (result as any).wallThicknessMm;
        const bendClosureWt = rawResultWallThickness || 5;
        const bendClosureWeight =
          nominalBoreMm && bendClosureLengthMm > 0
            ? getClosureWeight(nominalBoreMm, bendClosureLengthMm, bendClosureWt, nbToOdMap)
            : 0;
        const bendTackEnds = getTackWeldEndsPerBend(bendEndConfigForFlanges);
        const bendTackWeight =
          nominalBoreMm && bendTackEnds > 0 ? getTackWeldWeight(nominalBoreMm, bendTackEnds) : 0;

        const rawResultTotalWeight = (result as any).totalWeight;
        const rawResultBendWeight = (result as any).bendWeight;
        const rawResultTangentWeight = (result as any).tangentWeight;
        const bendTotalWithFlanges =
          (rawResultTotalWeight || (rawResultBendWeight || 0) + (rawResultTangentWeight || 0)) +
          bendFlangeWeight +
          bendClosureWeight +
          bendTackWeight;
        // When pricing was skipped (weights not loaded yet), omit the
        // flange fields entirely — flangeWeight: undefined keeps the calc
        // marked stale for the mount-trigger to redo with real data.
        const bendFlangesPriced = bendFlangeCount === 0 || allWeights.length > 0;

        updateItem(entryId, {
          calculation: {
            ...result,
            ...(bendFlangesPriced
              ? {
                  flangeWeight: bendFlangeWeight,
                  flangeWeightPerUnit: bendFlangePerUnit,
                  numberOfFlanges: bendFlangeCount,
                  closureWeight: bendClosureWeight,
                  tackWeldWeight: bendTackWeight,
                  totalWeight: bendTotalWithFlanges,
                }
              : {}),
            flangeSpecs: flangeSpecData,
          },
          calculationError: null,
        });
      } catch (error: any) {
        const isNotFoundError =
          error?.message?.includes("404") || error?.message?.toLowerCase().includes("not found");
        if (isNotFoundError) {
          log.debug("Bend not found (expected):", error?.message);
        } else {
          log.error("Bend calculation failed:", error);
        }
        const bendEntry = rfqDataRef.current.items.find(
          (e) => e.id === entryId && e.itemType === "bend",
        ) as BendEntry | undefined;
        const nb = bendEntry?.specs?.nominalBoreMm;
        const schedule = bendEntry?.specs?.scheduleNumber;
        const angle = bendEntry?.specs?.bendDegrees;
        const parts = [
          nb ? `${nb}mm bore` : null,
          schedule ? `${schedule} schedule` : null,
          angle ? `${angle}° angle` : null,
        ].filter(Boolean);
        const details = parts.length > 0 ? parts.join(", ") : null;
        const capitalizedDetails = details
          ? details.charAt(0).toUpperCase() + details.slice(1)
          : null;
        const friendlyError = capitalizedDetails
          ? `**Bend:** ${capitalizedDetails} is not available. Please try a different combination.`
          : "**Bend:** This combination is not available. Please try different specifications.";
        updateItem(entryId, { calculationError: friendlyError });
      }
    },
    [updateItem, masterData.flangeTypes],
  );

  const handleCalculateFitting = useCallback(
    async (entryId: string) => {
      log.debug("handleCalculateFitting called with entryId:", entryId);
      try {
        const { masterDataApi } = await import("@/app/lib/api/client");

        const entry = rfqDataRef.current.items.find(
          (e) => e.id === entryId && e.itemType === "fitting",
        );
        if (!entry || entry.itemType !== "fitting") return;

        const fittingEntry = entry;

        const rawSteelSpecificationId5 = fittingEntry.specs?.steelSpecificationId;

        // Get effective fitting standard (use item-level override first, then global spec)
        // Item-level steelSpecificationId takes precedence over global
        const effectiveSteelSpecId =
          rawSteelSpecificationId5 || rfqDataRef.current.globalSpecs?.steelSpecificationId;
        const isSABS719 = effectiveSteelSpecId === 8;
        const rawFittingStandard = fittingEntry.specs?.fittingStandard;
        const effectiveFittingStandard = rawFittingStandard || (isSABS719 ? "SABS719" : "SABS62");

        // Valid fitting types for each standard (must match dropdown options)
        const SABS62_FITTING_TYPES = [
          "EQUAL_TEE",
          "UNEQUAL_TEE",
          "LATERAL",
          "SWEEP_TEE",
          "Y_PIECE",
          "GUSSETTED_TEE",
          "EQUAL_CROSS",
          "UNEQUAL_CROSS",
          "CON_REDUCER",
          "ECCENTRIC_REDUCER",
          "OFFSET_BEND",
        ];
        const SABS719_FITTING_TYPES = [
          "SHORT_TEE",
          "UNEQUAL_SHORT_TEE",
          "SHORT_REDUCING_TEE",
          "GUSSET_TEE",
          "UNEQUAL_GUSSET_TEE",
          "GUSSET_REDUCING_TEE",
          "LATERAL",
          "DUCKFOOT_SHORT",
          "DUCKFOOT_GUSSETTED",
          "SWEEP_LONG_RADIUS",
          "SWEEP_MEDIUM_RADIUS",
          "SWEEP_ELBOW",
          "CON_REDUCER",
          "ECCENTRIC_REDUCER",
          "OFFSET_BEND",
        ];

        // Validation for required fields
        if (!fittingEntry.specs?.fittingType) {
          log.debug("Fitting calculation skipped: No fitting type selected");
          return;
        }

        // Offset bends are calculated client-side — but the result must
        // still be STORED on the entry: the calc-results card only renders
        // when entry.calculation exists, and the summary/Review/BOQ read
        // calculation.totalWeight (they showed 0.00kg without this).
        if (fittingEntry.specs.fittingType === "OFFSET_BEND") {
          const obSpecs = fittingEntry.specs;
          const rawObNominalDiameterMm = obSpecs.nominalDiameterMm;
          const obNb = rawObNominalDiameterMm || (obSpecs as any).nominalBoreMm;
          if (!obNb) {
            log.debug("Offset bend calculation skipped: no nominal diameter");
            return;
          }
          // Don't price against an unloaded weight table — the lookup would
          // silently return per-NB fallbacks (e.g. 80kg/flange). Leaving the
          // calc unset lets the form's mount-trigger re-run once data lands.
          if (allWeights.length === 0) {
            log.debug("Offset bend calculation deferred: flange weights not loaded yet");
            return;
          }
          const rawObOd = nbToOdMap[obNb];
          const obOd = rawObOd || obNb * 1.05;
          const rawObSchedule = obSpecs.scheduleNumber;
          const obWtMatch = (rawObSchedule || "").match(/(\d+(?:\.\d+)?)/);
          const rawObWallThickness = (obSpecs as any).wallThicknessMm;
          const obWt = rawObWallThickness || (obWtMatch ? Number(obWtMatch[1]) : 6);
          const rawLengthA = (obSpecs as any).offsetLengthA;
          const lengthA = rawLengthA || 0;
          const rawLengthB = (obSpecs as any).offsetLengthB;
          const lengthB = rawLengthB || 0;
          const rawLengthC = (obSpecs as any).offsetLengthC;
          const lengthC = rawLengthC || 0;
          const totalLengthM = (lengthA + lengthB + lengthC) / 1000;
          const kgPerM = (obOd - obWt) * obWt * 0.02466;
          const obPipeWeight = kgPerM * totalLengthM;

          const rawObClassId = obSpecs.flangePressureClassId;
          const obClassId = rawObClassId || rfqDataRef.current.globalSpecs?.flangePressureClassId;
          const rawObStandardId = obSpecs.flangeStandardId;
          const obStandardId = rawObStandardId || rfqDataRef.current.globalSpecs?.flangeStandardId;
          const rawObBaseDesignation = masterData.pressureClasses?.find(
            (pc: any) => pc.id === obClassId,
          )?.designation;
          const obBaseDesignation = rawObBaseDesignation || "PN16";
          const obStandardCode = masterData.flangeStandards?.find(
            (s: any) => s.id === obStandardId,
          )?.code;
          const rawObTypeCode = obSpecs.flangeTypeCode;
          const obTypeCode = rawObTypeCode || rfqDataRef.current.globalSpecs?.flangeTypeCode;
          const obDesignation = getPressureClassWithFlangeType(
            obBaseDesignation,
            obTypeCode,
            obStandardCode,
          );
          const rawObEndConfig = obSpecs.pipeEndConfiguration;
          const obEndConfig = rawObEndConfig || "PE";
          const obFlangeCounts = getFittingFlangeCounts(obEndConfig);
          const obNumFlanges = obFlangeCounts.main + obFlangeCounts.branch;
          const obFlangePerUnit =
            obNumFlanges > 0
              ? flangeWeightLookup(
                  allWeights,
                  obNb,
                  obDesignation,
                  obStandardCode || null,
                  obTypeCode || "",
                )
              : 0;
          const obFlangeWeight = obNumFlanges * obFlangePerUnit;
          const rawObQty = obSpecs.quantityValue;
          const obQty = rawObQty || 1;
          const obTotalWeight = (obPipeWeight + obFlangeWeight) * obQty;

          updateItem(entryId, {
            calculation: {
              totalWeight: obTotalWeight,
              fittingWeight: obPipeWeight,
              flangeWeight: obFlangeWeight,
              numberOfFlanges: obNumFlanges,
              flangeWeightPerUnit: obFlangePerUnit,
              wallThicknessMm: obWt,
              outsideDiameterMm: obOd,
              pressureClassUsed: obDesignation,
            } as any,
            calculationError: null,
          });
          return;
        }

        // Validate fitting type is compatible with the effective standard
        const validTypes =
          effectiveFittingStandard === "SABS719" ? SABS719_FITTING_TYPES : SABS62_FITTING_TYPES;
        if (!validTypes.includes(fittingEntry.specs.fittingType)) {
          log.debug(
            `Fitting type "${fittingEntry.specs.fittingType}" not valid for ${effectiveFittingStandard}, clearing`,
          );
          // Clear the invalid fitting type
          updateItem(entryId, { specs: { ...fittingEntry.specs, fittingType: undefined } });
          return;
        }

        if (!fittingEntry.specs?.nominalDiameterMm) {
          log.debug("Fitting calculation skipped: No nominal diameter selected");
          return;
        }

        // Additional validation for SABS719
        if (effectiveFittingStandard === "SABS719") {
          if (!fittingEntry.specs.scheduleNumber) {
            log.debug("Fitting calculation skipped: No schedule number for SABS719");
            return;
          }
          if (
            fittingEntry.specs.pipeLengthAMm === undefined ||
            fittingEntry.specs.pipeLengthBMm === undefined
          ) {
            log.debug("Fitting calculation skipped: Missing pipe lengths for SABS719");
            return;
          }
        }

        const apiFittingType = normalizeFittingTypeForApi(fittingEntry.specs.fittingType);
        if (!apiFittingType) {
          log.debug("Fitting calculation skipped: Unable to map fitting type for API");
          return;
        }

        const rawQuantityValue5 = fittingEntry.specs.quantityValue;
        const rawWorkingPressureBar4 = fittingEntry.specs.workingPressureBar;
        const rawWorkingTemperatureC4 = fittingEntry.specs.workingTemperatureC;
        const rawSteelSpecificationId6 = fittingEntry.specs.steelSpecificationId;
        const rawFlangeStandardId5 = fittingEntry.specs.flangeStandardId;
        const rawFlangePressureClassId6 = fittingEntry.specs.flangePressureClassId;
        const rawBranchNominalDiameterMm5 = fittingEntry.specs.branchNominalDiameterMm;
        const rawTeeNominalDiameterMm5 = fittingEntry.specs.teeNominalDiameterMm;
        const effectiveBranchDiameterMm = rawBranchNominalDiameterMm5 || rawTeeNominalDiameterMm5;

        const calculationData = {
          fittingStandard: effectiveFittingStandard,
          fittingType: apiFittingType,
          nominalDiameterMm: fittingEntry.specs.nominalDiameterMm,
          angleRange: fittingEntry.specs.angleRange,
          branchDiameterMm:
            effectiveBranchDiameterMm &&
            effectiveBranchDiameterMm !== fittingEntry.specs.nominalDiameterMm
              ? effectiveBranchDiameterMm
              : undefined,
          pipeLengthAMm: fittingEntry.specs.pipeLengthAMm,
          pipeLengthBMm: fittingEntry.specs.pipeLengthBMm,
          quantityValue: rawQuantityValue5 || 1,
          scheduleNumber: fittingEntry.specs.scheduleNumber,
          workingPressureBar:
            rawWorkingPressureBar4 || rfqDataRef.current.globalSpecs.workingPressureBar,
          workingTemperatureC:
            rawWorkingTemperatureC4 || rfqDataRef.current.globalSpecs.workingTemperatureC,
          steelSpecificationId:
            rawSteelSpecificationId6 || rfqDataRef.current.globalSpecs.steelSpecificationId,
          flangeStandardId: rawFlangeStandardId5 || rfqDataRef.current.globalSpecs.flangeStandardId,
          flangePressureClassId:
            rawFlangePressureClassId6 || rfqDataRef.current.globalSpecs.flangePressureClassId,
        };

        log.debug("Calling API with:", calculationData);
        const result = await masterDataApi.calculateFitting(calculationData);
        log.debug("API result:", result);

        const rawFlangeStandardId6 = fittingEntry.specs?.flangeStandardId;

        // Fetch dynamic flange specs if available
        const effectiveFlangeStandardId =
          rawFlangeStandardId6 || rfqDataRef.current.globalSpecs?.flangeStandardId;
        const rawFlangePressureClassId7 = fittingEntry.specs?.flangePressureClassId;
        const effectiveFlangePressureClassId =
          rawFlangePressureClassId7 || rfqDataRef.current.globalSpecs?.flangePressureClassId;
        const rawFlangeTypeCode7 = fittingEntry.specs?.flangeTypeCode;
        const effectiveFlangeTypeCode =
          rawFlangeTypeCode7 || rfqDataRef.current.globalSpecs?.flangeTypeCode;
        let flangeSpecData: FlangeSpecData | null = null;

        if (
          effectiveFlangeStandardId &&
          effectiveFlangePressureClassId &&
          fittingEntry.specs?.nominalDiameterMm
        ) {
          const flangeTypeId = effectiveFlangeTypeCode
            ? masterData.flangeTypes?.find((ft: any) => ft.code === effectiveFlangeTypeCode)?.id
            : undefined;
          flangeSpecData = await fetchFlangeSpecsStatic(
            fittingEntry.specs.nominalDiameterMm,
            effectiveFlangeStandardId,
            effectiveFlangePressureClassId,
            flangeTypeId,
          );
          if (flangeSpecData) {
            log.debug(
              `🔧 Fitting using dynamic flange specs: ${flangeSpecData.flangeMassKg}kg/flange`,
            );
          }
        }

        updateItem(entryId, {
          calculation: {
            ...result,
            flangeSpecs: flangeSpecData,
          },
          calculationError: null,
        });
        log.debug("Updated entry with calculation");
      } catch (error: any) {
        const isNotFoundError =
          error?.message?.includes("404") || error?.message?.toLowerCase().includes("not found");
        if (isNotFoundError) {
          log.debug("Fitting not found (expected):", error?.message);
        } else {
          log.error("Fitting calculation failed:", error);
        }
        const fittingEntry = rfqDataRef.current.items.find(
          (e) => e.id === entryId && e.itemType === "fitting",
        ) as FittingEntry | undefined;
        const nb = fittingEntry?.specs?.nominalDiameterMm;
        const schedule = fittingEntry?.specs?.scheduleNumber;
        const fittingType = fittingEntry?.specs?.fittingType?.replace(/_/g, " ").toLowerCase();
        const parts = [
          fittingType,
          nb ? `${nb}mm` : null,
          schedule ? `${schedule} schedule` : null,
        ].filter(Boolean);
        const details = parts.length > 0 ? parts.join(", ") : null;
        const capitalizedDetails = details
          ? details.charAt(0).toUpperCase() + details.slice(1)
          : null;
        const friendlyError = capitalizedDetails
          ? `**Fitting:** ${capitalizedDetails} is not available. Please try a different combination.`
          : "**Fitting:** This combination is not available. Please try different specifications.";
        updateItem(entryId, { calculationError: friendlyError });
      }
    },
    [updateItem, masterData.flangeTypes],
  );
  return { handleCalculateAll, handleCalculateBend, handleCalculateFitting };
}
