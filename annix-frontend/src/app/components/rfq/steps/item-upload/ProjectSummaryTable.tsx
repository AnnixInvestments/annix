import { FLANGE_OD } from "@annix/product-data/pipe";
import { STEEL_DENSITY_KG_M3 } from "@annix/product-data/steel";
import React, { memo } from "react";
import {
  boltSetCountPerBend as getBoltSetCountPerBend,
  boltSetCountPerFitting as getBoltSetCountPerFitting,
  boltSetCountPerPipe as getBoltSetCountPerPipe,
  closureWeight as getClosureWeight,
  fittingBranchNbMm as getFittingBranchNbMm,
  flangesPerPipe as getFlangesPerPipe,
  tackWeldEndsPerPipe as getTackWeldEndsPerPipe,
  tackWeldWeight as getTackWeldWeight,
} from "@/app/lib/config/rfq";
import {
  blankFlangeSurfaceArea,
  bnwSetInfo,
  gasketWeightLookup,
  sansBlankFlangeWeight,
  useAllBnwSetWeights,
  useAllFlangeTypeWeights,
  useAllGasketWeights,
  useNbToOdMap,
} from "@/app/lib/query/hooks";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import {
  perUnitSurfaceAreas,
  weldThicknessForEntry,
} from "@/app/lib/utils/rfq/itemSummaryCalculations";

const ProjectSummaryTableInner = () => {
  const rfqData = useRfqWizardStore((s) => s.rfqData) as any;
  const masterData = useRfqWizardStore((s) => s.masterData);
  const onUpdateGlobalSpecs = useRfqWizardStore((s) => s.updateGlobalSpecs) as (specs: any) => void;
  const globalSpecs = rfqData.globalSpecs;
  const entries = rfqData.items.length > 0 ? rfqData.items : rfqData.straightPipeEntries;
  const rawRequiredProducts = rfqData.requiredProducts;
  const requiredProducts = rawRequiredProducts || [];
  const { data: nbToOdMap = {} } = useNbToOdMap();
  const { data: allWeights = [] } = useAllFlangeTypeWeights();
  const { data: allBnwSets = [] } = useAllBnwSetWeights();
  const { data: allGaskets = [] } = useAllGasketWeights();

  const formatWeight = (weight: number | undefined) => {
    if (weight === undefined) return "Not calculated";
    return `${weight.toFixed(2)} kg`;
  };

  // Closures, tack welds and puddle plates aren't part of
  // calculation.totalSystemWeight (pipe + flanges); derive them from specs
  // the same way the form's weight breakdown does so both surfaces report
  // the same line weight.
  const pipeExtrasWeight = (entry: any, qty: number) => {
    const nb = entry.specs?.nominalBoreMm;
    if (!nb || qty <= 0) return 0;
    const endConfig = entry.specs?.pipeEndConfiguration || "PE";
    const tackEnds = getTackWeldEndsPerPipe(endConfig);
    const tackWeight = tackEnds > 0 ? getTackWeldWeight(nb, tackEnds) * qty : 0;
    const closureLengthMm = entry.specs?.closureLengthMm || 0;
    const wallThickness = entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm || 0;
    const closureTotal =
      closureLengthMm > 0 && wallThickness > 0
        ? getClosureWeight(nb, closureLengthMm, wallThickness, nbToOdMap) * qty
        : 0;
    const isPuddle = entry.specs?.pipeType === "puddle";
    const rawPuddleOdMm = entry.specs?.puddleFlangeOdMm;
    const puddleOdMm = rawPuddleOdMm || 0;
    const rawPuddleThkMm = entry.specs?.puddleFlangeThicknessMm;
    const puddleThkMm = rawPuddleThkMm || 0;
    const rawCalcOdMm = entry.calculation?.outsideDiameterMm;
    const rawMapOdMm = nbToOdMap[nb];
    const pipeOdMm = rawCalcOdMm || rawMapOdMm || 0;
    const puddleWeight =
      isPuddle && puddleOdMm > 0 && puddleThkMm > 0 && pipeOdMm > 0
        ? Math.PI *
          ((puddleOdMm / 2000) ** 2 - (pipeOdMm / 2000) ** 2) *
          (puddleThkMm / 1000) *
          STEEL_DENSITY_KG_M3 *
          qty
        : 0;
    return tackWeight + closureTotal + puddleWeight;
  };

  const getTotalWeight = () => {
    // Check if BNW should be included
    const showBnw = requiredProducts.includes("fasteners_gaskets");

    return entries.reduce((total: number, entry: any) => {
      const rawCalculatedPipeCount = entry.calculation?.calculatedPipeCount;
      const rawQuantityValue = entry.specs?.quantityValue;
      const qty = rawCalculatedPipeCount || rawQuantityValue || 0;

      // Calculate item weight based on type
      let entryTotal = 0;
      if (entry.itemType === "bend") {
        const rawBendWeight = entry.calculation?.bendWeight;
        // For bends, use component weights (per-unit) * qty
        const bendWeightPerUnit = rawBendWeight || 0;
        const rawTangentWeight = entry.calculation?.tangentWeight;
        const tangentWeightPerUnit = rawTangentWeight || 0;
        const rawFlangeWeight = entry.calculation?.flangeWeight;
        const flangeWeightPerUnit = rawFlangeWeight || 0;
        entryTotal = (bendWeightPerUnit + tangentWeightPerUnit + flangeWeightPerUnit) * qty;
      } else if (entry.itemType === "fitting") {
        const rawTotalWeight = entry.calculation?.totalWeight;
        entryTotal = rawTotalWeight || 0;
      } else {
        const rawTotalSystemWeight = entry.calculation?.totalSystemWeight;
        // Straight pipes - totalSystemWeight (pipe + flanges) plus
        // spec-derived closures and tack welds, matching the line items.
        entryTotal = (rawTotalSystemWeight || 0) + pipeExtrasWeight(entry, qty);
      }

      // Add BNW and gasket weights if applicable
      let bnwWeight = 0;
      let gasketWeight = 0;
      let stubBnwWeight = 0;
      let stubGasketWeight = 0;

      if (showBnw) {
        const rawFlangePressureClassId = entry.specs?.flangePressureClassId;
        const pressureClassId = rawFlangePressureClassId || globalSpecs?.flangePressureClassId;
        const pressureClass = pressureClassId
          ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)?.designation
          : "PN16";
        const rawNominalBoreMm = entry.specs?.nominalBoreMm;
        const nbMm = rawNominalBoreMm || 100;

        // Determine if item has flanges based on type
        let hasFlanges = false;
        if (entry.itemType === "bend") {
          const rawBendEndConfiguration = entry.specs?.bendEndConfiguration;
          const bendEndConfig = rawBendEndConfiguration || "PE";
          hasFlanges = bendEndConfig !== "PE";
        } else if (entry.itemType === "straight_pipe" || !entry.itemType) {
          const rawPipeEndConfiguration = entry.specs?.pipeEndConfiguration;
          const pipeEndConfig = rawPipeEndConfiguration || "PE";
          hasFlanges = pipeEndConfig !== "PE";
        } else if (entry.itemType === "fitting") {
          const rawFittingEndConfiguration = entry.specs?.pipeEndConfiguration;
          const fittingEndConfig = rawFittingEndConfiguration || "PE";
          hasFlanges = fittingEndConfig !== "PE";
        }

        if (hasFlanges && qty > 0) {
          if (entry.itemType === "fitting") {
            // Fittings allocate per NB: openings-1 on the main run plus one
            // set per different-size branch/reducing end.
            const rawMainNb = entry.specs?.nominalDiameterMm || entry.specs?.nominalBoreMm;
            const mainNb = rawMainNb || 100;
            const branchNb = getFittingBranchNbMm(entry.specs) || mainNb;
            const fittingEndConfig = entry.specs?.pipeEndConfiguration || "PE";
            const fittingSets = getBoltSetCountPerFitting(fittingEndConfig, mainNb === branchNb);
            const mainBnwInfo = bnwSetInfo(allBnwSets, mainNb, pressureClass || "PN16");
            const mainSetWeight = mainBnwInfo.weightPerHole * mainBnwInfo.holesPerFlange;
            bnwWeight = mainSetWeight * fittingSets.mainBoltSets * qty;
            if (fittingSets.branchBoltSets > 0) {
              const branchBnwInfo = bnwSetInfo(allBnwSets, branchNb, pressureClass || "PN16");
              bnwWeight +=
                branchBnwInfo.weightPerHole *
                branchBnwInfo.holesPerFlange *
                fittingSets.branchBoltSets *
                qty;
            }
            if (globalSpecs?.gasketType) {
              gasketWeight =
                gasketWeightLookup(allGaskets, globalSpecs.gasketType, mainNb) *
                fittingSets.mainBoltSets *
                qty;
              if (fittingSets.branchBoltSets > 0) {
                gasketWeight +=
                  gasketWeightLookup(allGaskets, globalSpecs.gasketType, branchNb) *
                  fittingSets.branchBoltSets *
                  qty;
              }
            }
          } else {
            const isSweepTeeBend =
              entry.itemType === "bend" && entry.specs?.bendItemType === "SWEEP_TEE";
            const setsPerItem = isSweepTeeBend ? 2 : 1;
            const bnwInfo = bnwSetInfo(allBnwSets, nbMm, pressureClass || "PN16");
            const bnwWeightPerSet = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
            bnwWeight = bnwWeightPerSet * setsPerItem * qty;

            // Add gasket weight
            if (globalSpecs?.gasketType) {
              const singleGasketWeight = gasketWeightLookup(
                allGaskets,
                globalSpecs.gasketType,
                nbMm,
              );
              gasketWeight = singleGasketWeight * setsPerItem * qty;
            }
          }
        }

        // Add stub BNW and gasket weights for bends
        if (entry.itemType === "bend" && entry.specs?.stubs?.length > 0) {
          entry.specs.stubs.forEach((stub: any) => {
            if (stub?.nominalBoreMm) {
              const stubNb = stub.nominalBoreMm;
              const stubBnwInfo = bnwSetInfo(allBnwSets, stubNb, pressureClass || "PN16");
              const stubBnwWeightPerSet = stubBnwInfo.weightPerHole * stubBnwInfo.holesPerFlange;
              stubBnwWeight += stubBnwWeightPerSet * qty;

              if (globalSpecs?.gasketType) {
                const stubSingleGasketWeight = gasketWeightLookup(
                  allGaskets,
                  globalSpecs.gasketType,
                  stubNb,
                );
                stubGasketWeight += stubSingleGasketWeight * qty;
              }
            }
          });
        }
      }

      // Blank flanges render as their own BKF line items, so they must
      // count toward the total regardless of the fasteners selection.
      let blankWeight = 0;
      if (entry.specs?.addBlankFlange && qty > 0) {
        const rawBlankPressureClassId = entry.specs?.flangePressureClassId;
        const blankPressureClassId = rawBlankPressureClassId || globalSpecs?.flangePressureClassId;
        const blankPressureClass = blankPressureClassId
          ? masterData.pressureClasses?.find((p: any) => p.id === blankPressureClassId)?.designation
          : "PN16";
        const rawBlankNominalDiameterMm = entry.specs?.nominalDiameterMm;
        const rawBlankNominalBoreMm = entry.specs?.nominalBoreMm;
        const blankNb =
          entry.itemType === "fitting"
            ? rawBlankNominalDiameterMm || rawBlankNominalBoreMm || 100
            : rawBlankNominalBoreMm || 100;
        const blankCount = (entry.specs?.blankFlangeCount || 1) * qty;
        blankWeight =
          sansBlankFlangeWeight(allWeights, blankNb, blankPressureClass || "PN16") * blankCount;
      }

      return (
        total +
        entryTotal +
        bnwWeight +
        gasketWeight +
        stubBnwWeight +
        stubGasketWeight +
        blankWeight
      );
    }, 0);
  };

  return (
    <div className="border-2 border-blue-200 rounded-md p-3 bg-blue-50">
      {/* Header row with title */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-bold text-blue-900">Project Summary</h3>
      </div>
      {/* Items table - each item on its own line */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-blue-300">
              <th className="text-left py-2 px-2 text-xs font-semibold text-blue-800">Item #</th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-blue-800">
                Description
              </th>
              <th className="text-center py-2 px-2 text-xs font-semibold text-blue-800">Weld WT</th>
              {requiredProducts.includes("surface_protection") && (
                <th className="text-center py-2 px-2 text-xs font-semibold text-blue-800">
                  Ext m²
                </th>
              )}
              {requiredProducts.includes("surface_protection") && (
                <th className="text-center py-2 px-2 text-xs font-semibold text-blue-800">
                  Int m²
                </th>
              )}
              <th className="text-center py-2 px-2 text-xs font-semibold text-blue-800">Qty</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-blue-800">
                Weight/Item
              </th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-blue-800">
                Line Weight
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry: any, index: number) => {
              const rawClientItemNumber4 = entry.clientItemNumber;
              const itemNumber = rawClientItemNumber4 || `#${index + 1}`;
              const rawCalculatedPipeCount2 = entry.calculation?.calculatedPipeCount;
              const rawQuantityValue2 = entry.specs?.quantityValue;
              const qty = rawCalculatedPipeCount2 || rawQuantityValue2 || 0;

              // Calculate weights differently for bends vs straight pipes
              let totalWeight = 0;
              let weightPerItem = 0;

              if (entry.itemType === "bend") {
                const rawBendWeight2 = entry.calculation?.bendWeight;
                // For bends, use component weights (bendWeight + tangentWeight are per-unit)
                const bendWeightPerUnit = rawBendWeight2 || 0;
                const rawTangentWeight2 = entry.calculation?.tangentWeight;
                const tangentWeightPerUnit = rawTangentWeight2 || 0;
                const rawFlangeWeight2 = entry.calculation?.flangeWeight;
                // Flange weight from calculation (already per-unit in API response)
                const flangeWeightPerUnit = rawFlangeWeight2 || 0;
                weightPerItem = bendWeightPerUnit + tangentWeightPerUnit + flangeWeightPerUnit;
                totalWeight = weightPerItem * qty;
              } else if (entry.itemType === "fitting") {
                const rawCalculation = entry.calculation;
                // For fittings, totalWeight may not be set - fall back to sum of components
                const fittingCalc = rawCalculation || {};
                const rawTotalWeight2 = fittingCalc.totalWeight;
                const rawFittingWeight = fittingCalc.fittingWeight;
                const rawPipeWeight = fittingCalc.pipeWeight;
                const rawFlangeWeight3 = fittingCalc.flangeWeight;
                const rawBoltWeight = fittingCalc.boltWeight;
                const rawNutWeight = fittingCalc.nutWeight;
                totalWeight =
                  rawTotalWeight2 ||
                  (rawFittingWeight || 0) +
                    (rawPipeWeight || 0) +
                    (rawFlangeWeight3 || 0) +
                    (rawBoltWeight || 0) +
                    (rawNutWeight || 0);
                weightPerItem = qty > 0 ? totalWeight / qty : 0;
              } else {
                const rawTotalSystemWeight2 = entry.calculation?.totalSystemWeight;
                // For straight pipes, totalSystemWeight is already total
                // (pipe + flanges); closures and tack welds are computed from
                // specs so the line matches the form's weight breakdown.
                totalWeight = (rawTotalSystemWeight2 || 0) + pipeExtrasWeight(entry, qty);
                weightPerItem = qty > 0 ? totalWeight / qty : 0;
              }

              // Calculate BNW info if fasteners_gaskets is selected and item has flanges
              const showBnw = requiredProducts?.includes("fasteners_gaskets");

              // Calculate flanges per item based on item type
              let flangesPerPipe = 0;
              let stubFlangesPerItem = 0;
              let boltSetsPerItem = 0;

              if (entry.itemType === "straight_pipe" || !entry.itemType) {
                const rawPipeEndConfiguration4 = entry.specs?.pipeEndConfiguration;
                const pipeEndConfig = rawPipeEndConfiguration4 || "PE";
                flangesPerPipe = getFlangesPerPipe(pipeEndConfig);
                boltSetsPerItem = getBoltSetCountPerPipe(pipeEndConfig);
              } else if (entry.itemType === "bend") {
                const rawBendEndConfiguration3 = entry.specs?.bendEndConfiguration;
                // Calculate main bend flanges based on bendEndConfiguration
                const bendEndConfig = rawBendEndConfiguration3 || "PE";
                if (
                  bendEndConfig === "FBE" ||
                  bendEndConfig === "FOE_RF" ||
                  bendEndConfig === "2X_RF" ||
                  bendEndConfig === "2xLF"
                ) {
                  flangesPerPipe = 2;
                } else if (bendEndConfig === "FOE" || bendEndConfig === "FOE_LF") {
                  flangesPerPipe = 1;
                }
                // Bolt sets: 2 same-sized flanged ends = 1 bolt set. A sweep
                // tee has a third same-NB opening (the branch), so openings-1
                // gives one extra set.
                boltSetsPerItem = getBoltSetCountPerBend(bendEndConfig);
                if (entry.specs?.bendItemType === "SWEEP_TEE" && boltSetsPerItem > 0) {
                  boltSetsPerItem += 1;
                }
                const rawNumberOfStubs2 = entry.specs?.numberOfStubs;
                // Add stub flanges (each stub has 1 flange AND 1 bolt set)
                stubFlangesPerItem = rawNumberOfStubs2 || 0;
              } else if (entry.itemType === "fitting") {
                const rawPipeEndConfiguration5 = entry.specs?.pipeEndConfiguration;
                // Calculate fitting flanges based on pipeEndConfiguration
                const fittingEndConfig = rawPipeEndConfiguration5 || "PE";
                if (fittingEndConfig === "F2E") flangesPerPipe = 2;
                else if (fittingEndConfig === "F2E_LF") flangesPerPipe = 2;
                else if (fittingEndConfig === "F2E_RF") flangesPerPipe = 2;
                else if (fittingEndConfig === "3X_RF") flangesPerPipe = 3;
                else if (fittingEndConfig === "2X_RF_FOE") flangesPerPipe = 3;
                else if (fittingEndConfig !== "PE") flangesPerPipe = 1;
                // Bolt sets for fittings handled separately below
              }

              const totalFlanges = flangesPerPipe * qty;
              const totalStubFlanges = stubFlangesPerItem * qty;
              const totalBoltSets = boltSetsPerItem * qty;

              const rawFlangePressureClassId5 = entry.specs?.flangePressureClassId;

              // Get pressure class for BNW lookup
              const pressureClassId =
                rawFlangePressureClassId5 || globalSpecs?.flangePressureClassId;
              const pressureClass = pressureClassId
                ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)
                    ?.designation
                : "PN16";

              const rawFlangeStandardId4 = entry.specs?.flangeStandardId;

              // Get flange standard for dynamic spec display (e.g., "SANS 1123 1000/3")
              const flangeStandardId = rawFlangeStandardId4 || globalSpecs?.flangeStandardId;
              const flangeStandardCode = flangeStandardId
                ? masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId)?.code
                : null;
              const flangeSpec =
                flangeStandardCode && pressureClass
                  ? `${flangeStandardCode} ${pressureClass}`
                  : pressureClass || "PN16";

              const rawNominalBoreMm4 = entry.specs?.nominalBoreMm;

              const nbMm = rawNominalBoreMm4 || 100;

              // Get BNW set info
              const bnwInfo = bnwSetInfo(allBnwSets, nbMm, pressureClass || "PN16");
              const bnwWeightPerSet = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;

              const weldThickness = weldThicknessForEntry(entry, globalSpecs, masterData);
              const surfaceAreas = perUnitSurfaceAreas(entry, globalSpecs, masterData, nbToOdMap);

              const rawDescription = entry.description;

              return (
                <React.Fragment key={entry.id}>
                  <tr className="border-b border-blue-100 hover:bg-blue-100/50">
                    <td className="py-2 px-2 font-medium text-blue-900">{itemNumber}</td>
                    <td
                      className="py-2 px-2 text-gray-800 max-w-xs truncate"
                      title={entry.description}
                    >
                      {rawDescription || "No description"}
                    </td>
                    <td className="py-2 px-2 text-center text-gray-700 text-xs">
                      {weldThickness ? (
                        <span title={weldThickness.label}>
                          {weldThickness.thickness?.toFixed(2)}mm
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    {requiredProducts.includes("surface_protection") && (
                      <td className="py-2 px-2 text-center text-gray-700 text-xs">
                        {surfaceAreas.external !== null ? surfaceAreas.external.toFixed(2) : "-"}
                      </td>
                    )}
                    {requiredProducts.includes("surface_protection") && (
                      <td className="py-2 px-2 text-center text-gray-700 text-xs">
                        {surfaceAreas.internal !== null ? surfaceAreas.internal.toFixed(2) : "-"}
                      </td>
                    )}
                    <td className="py-2 px-2 text-center font-medium text-gray-900">{qty}</td>
                    <td className="py-2 px-2 text-right text-gray-700">
                      {formatWeight(weightPerItem)}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-blue-900">
                      {formatWeight(totalWeight)}
                    </td>
                  </tr>
                  {/* BNW Line Item - only show if fasteners selected and item has flanges (not for fittings - handled separately) */}
                  {showBnw && totalBoltSets > 0 && entry.itemType !== "fitting" && (
                    <tr className="border-b border-orange-100 bg-orange-50/50 hover:bg-orange-100/50">
                      <td className="py-2 px-2 font-medium text-orange-800">
                        BNW-{itemNumber.replace(/#?AIS-?/g, "")}
                      </td>
                      <td className="py-2 px-2 text-orange-700 text-xs">
                        {entry.itemType === "bend" ? "Main Flange: " : ""}
                        {bnwInfo.boltSize} BNW Set x{bnwInfo.holesPerFlange} (1 each) - {nbMm}
                        NB {flangeSpec}
                      </td>
                      <td className="py-2 px-2 text-center text-orange-600">-</td>
                      {requiredProducts.includes("surface_protection") && (
                        <td className="py-2 px-2 text-center text-orange-600">-</td>
                      )}
                      {requiredProducts.includes("surface_protection") && (
                        <td className="py-2 px-2 text-center text-orange-600">-</td>
                      )}
                      <td className="py-2 px-2 text-center font-medium text-orange-800">
                        {totalBoltSets}
                      </td>
                      <td className="py-2 px-2 text-right text-orange-700">
                        {formatWeight(bnwWeightPerSet)}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-orange-800">
                        {formatWeight(bnwWeightPerSet * totalBoltSets)}
                      </td>
                    </tr>
                  )}
                  {/* Gasket Line Item - only show if fasteners selected and item has flanges (not for fittings - handled separately) */}
                  {showBnw &&
                    totalBoltSets > 0 &&
                    globalSpecs?.gasketType &&
                    entry.itemType !== "fitting" &&
                    (() => {
                      const rawNominalBoreMm6 = entry.specs?.nominalBoreMm;
                      const gasketWeight = gasketWeightLookup(
                        allGaskets,
                        globalSpecs.gasketType,
                        rawNominalBoreMm6 || 100,
                      );
                      const gasketTotalWeight = gasketWeight * totalBoltSets;
                      const rawNominalBoreMm7 = entry.specs?.nominalBoreMm;
                      return (
                        <tr className="border-b border-green-100 bg-green-50/50 hover:bg-green-100/50">
                          <td className="py-2 px-2 font-medium text-green-800">
                            GAS-{itemNumber.replace(/#?AIS-?/g, "")}
                          </td>
                          <td className="py-2 px-2 text-green-700 text-xs">
                            {globalSpecs.gasketType} Gasket (1 each) - {rawNominalBoreMm7 || 100}NB{" "}
                            {flangeSpec}
                          </td>
                          <td className="py-2 px-2 text-center text-green-600">-</td>
                          {requiredProducts.includes("surface_protection") && (
                            <td className="py-2 px-2 text-center text-green-600">-</td>
                          )}
                          {requiredProducts.includes("surface_protection") && (
                            <td className="py-2 px-2 text-center text-green-600">-</td>
                          )}
                          <td className="py-2 px-2 text-center font-medium text-green-800">
                            {totalBoltSets}
                          </td>
                          <td className="py-2 px-2 text-right text-green-700">
                            {gasketWeight.toFixed(2)} kg
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-green-800">
                            {gasketTotalWeight.toFixed(2)} kg
                          </td>
                        </tr>
                      );
                    })()}
                  {/* Fitting BNW and Gasket Line Items - for tees/laterals with flanges */}
                  {showBnw &&
                    totalFlanges > 0 &&
                    entry.itemType === "fitting" &&
                    (() => {
                      const rawNominalDiameterMm2 = entry.specs?.nominalDiameterMm;
                      const rawNominalBoreMm2 = entry.specs?.nominalBoreMm;
                      const mainNb = rawNominalDiameterMm2 || rawNominalBoreMm2 || 100;
                      const branchNb = getFittingBranchNbMm(entry.specs) || mainNb;
                      const isEqualTee = mainNb === branchNb;
                      const rawPipeEndConfiguration8 = entry.specs?.pipeEndConfiguration;
                      const fittingEndConfig = rawPipeEndConfiguration8 || "PE";

                      // Use bolt set function: 3 same-sized ends = 2 bolt sets, 2 same-sized ends = 1 bolt set
                      const fittingBoltSets = getBoltSetCountPerFitting(
                        fittingEndConfig,
                        isEqualTee,
                      );
                      const mainBoltSetCount = fittingBoltSets.mainBoltSets;
                      const branchBoltSetCount = fittingBoltSets.branchBoltSets;

                      if (mainBoltSetCount === 0 && branchBoltSetCount === 0) return null;

                      const mainBnwInfo = bnwSetInfo(allBnwSets, mainNb, pressureClass || "PN16");
                      const mainBnwWeightPerSet =
                        mainBnwInfo.weightPerHole * mainBnwInfo.holesPerFlange;
                      const mainGasketWeight = globalSpecs?.gasketType
                        ? gasketWeightLookup(allGaskets, globalSpecs.gasketType, mainNb)
                        : 0;

                      const branchBnwInfo =
                        branchBoltSetCount > 0
                          ? bnwSetInfo(allBnwSets, branchNb, pressureClass || "PN16")
                          : null;
                      const branchBnwWeightPerSet = branchBnwInfo
                        ? branchBnwInfo.weightPerHole * branchBnwInfo.holesPerFlange
                        : 0;
                      const branchGasketWeight =
                        branchBoltSetCount > 0 && globalSpecs?.gasketType
                          ? gasketWeightLookup(allGaskets, globalSpecs.gasketType, branchNb)
                          : 0;

                      return (
                        <>
                          {/* Main NB BNW Sets */}
                          {mainBoltSetCount > 0 && (
                            <tr className="border-b border-orange-100 bg-orange-50/50 hover:bg-orange-100/50">
                              <td className="py-2 px-2 font-medium text-orange-800">
                                BNW-{itemNumber.replace(/#?AIS-?/g, "")}
                              </td>
                              <td className="py-2 px-2 text-orange-700 text-xs">
                                {mainBnwInfo.boltSize} BNW Set x{mainBnwInfo.holesPerFlange} (1 set
                                per pipe end × {mainBoltSetCount} ends) - {mainNb}NB {flangeSpec}
                              </td>
                              <td className="py-2 px-2 text-center text-orange-600">-</td>
                              {requiredProducts.includes("surface_protection") && (
                                <td className="py-2 px-2 text-center text-orange-600">-</td>
                              )}
                              {requiredProducts.includes("surface_protection") && (
                                <td className="py-2 px-2 text-center text-orange-600">-</td>
                              )}
                              <td className="py-2 px-2 text-center font-medium text-orange-800">
                                {mainBoltSetCount * qty}
                              </td>
                              <td className="py-2 px-2 text-right text-orange-700">
                                {formatWeight(mainBnwWeightPerSet)}
                              </td>
                              <td className="py-2 px-2 text-right font-semibold text-orange-800">
                                {formatWeight(mainBnwWeightPerSet * mainBoltSetCount * qty)}
                              </td>
                            </tr>
                          )}
                          {/* Branch NB BNW Sets - only if different size from main */}
                          {branchBoltSetCount > 0 && (
                            <tr className="border-b border-purple-100 bg-purple-50/50 hover:bg-purple-100/50">
                              <td className="py-2 px-2 font-medium text-purple-800">
                                BNW-{itemNumber.replace(/#?AIS-?/g, "")}-B
                              </td>
                              <td className="py-2 px-2 text-purple-700 text-xs">
                                Branch: {branchBnwInfo?.boltSize} BNW Set x
                                {branchBnwInfo?.holesPerFlange} ({branchBoltSetCount}{" "}
                                {branchBoltSetCount === 1 ? "set" : "sets"}) - {branchNb}NB{" "}
                                {flangeSpec}
                              </td>
                              <td className="py-2 px-2 text-center text-purple-600">-</td>
                              {requiredProducts.includes("surface_protection") && (
                                <td className="py-2 px-2 text-center text-purple-600">-</td>
                              )}
                              {requiredProducts.includes("surface_protection") && (
                                <td className="py-2 px-2 text-center text-purple-600">-</td>
                              )}
                              <td className="py-2 px-2 text-center font-medium text-purple-800">
                                {branchBoltSetCount * qty}
                              </td>
                              <td className="py-2 px-2 text-right text-purple-700">
                                {formatWeight(branchBnwWeightPerSet)}
                              </td>
                              <td className="py-2 px-2 text-right font-semibold text-purple-800">
                                {formatWeight(branchBnwWeightPerSet * branchBoltSetCount * qty)}
                              </td>
                            </tr>
                          )}
                          {/* Main NB Gaskets */}
                          {mainBoltSetCount > 0 && globalSpecs?.gasketType && (
                            <tr className="border-b border-green-100 bg-green-50/50 hover:bg-green-100/50">
                              <td className="py-2 px-2 font-medium text-green-800">
                                GAS-{itemNumber.replace(/#?AIS-?/g, "")}
                              </td>
                              <td className="py-2 px-2 text-green-700 text-xs">
                                {globalSpecs.gasketType} Gasket (1 per pipe end × {mainBoltSetCount}{" "}
                                ends) - {mainNb}NB {flangeSpec}
                              </td>
                              <td className="py-2 px-2 text-center text-green-600">-</td>
                              {requiredProducts.includes("surface_protection") && (
                                <td className="py-2 px-2 text-center text-green-600">-</td>
                              )}
                              {requiredProducts.includes("surface_protection") && (
                                <td className="py-2 px-2 text-center text-green-600">-</td>
                              )}
                              <td className="py-2 px-2 text-center font-medium text-green-800">
                                {mainBoltSetCount * qty}
                              </td>
                              <td className="py-2 px-2 text-right text-green-700">
                                {mainGasketWeight.toFixed(2)} kg
                              </td>
                              <td className="py-2 px-2 text-right font-semibold text-green-800">
                                {(mainGasketWeight * mainBoltSetCount * qty).toFixed(2)} kg
                              </td>
                            </tr>
                          )}
                          {/* Branch NB Gaskets - only if different from main */}
                          {branchBoltSetCount > 0 && globalSpecs?.gasketType && (
                            <tr className="border-b border-teal-100 bg-teal-50/50 hover:bg-teal-100/50">
                              <td className="py-2 px-2 font-medium text-teal-800">
                                GAS-{itemNumber.replace(/#?AIS-?/g, "")}-B
                              </td>
                              <td className="py-2 px-2 text-teal-700 text-xs">
                                Branch: {globalSpecs.gasketType} Gasket ({branchBoltSetCount}{" "}
                                {branchBoltSetCount === 1 ? "pc" : "pcs"}) - {branchNb}NB{" "}
                                {flangeSpec}
                              </td>
                              <td className="py-2 px-2 text-center text-teal-600">-</td>
                              {requiredProducts.includes("surface_protection") && (
                                <td className="py-2 px-2 text-center text-teal-600">-</td>
                              )}
                              {requiredProducts.includes("surface_protection") && (
                                <td className="py-2 px-2 text-center text-teal-600">-</td>
                              )}
                              <td className="py-2 px-2 text-center font-medium text-teal-800">
                                {branchBoltSetCount * qty}
                              </td>
                              <td className="py-2 px-2 text-right text-teal-700">
                                {branchGasketWeight.toFixed(2)} kg
                              </td>
                              <td className="py-2 px-2 text-right font-semibold text-teal-800">
                                {(branchGasketWeight * branchBoltSetCount * qty).toFixed(2)} kg
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  {/* Stub BNW Line Items - only for bends with stubs */}
                  {showBnw &&
                    totalStubFlanges > 0 &&
                    entry.itemType === "bend" &&
                    entry.specs?.stubs?.map((stub: any, stubIndex: number) => {
                      if (!stub?.nominalBoreMm) return null;
                      const stubNb = stub.nominalBoreMm;
                      const stubBnwInfo = bnwSetInfo(allBnwSets, stubNb, pressureClass || "PN16");
                      const stubBnwWeightPerSet =
                        stubBnwInfo.weightPerHole * stubBnwInfo.holesPerFlange;
                      const stubBnwTotalWeight = stubBnwWeightPerSet * qty;
                      return (
                        <tr
                          key={`stub-bnw-${stubIndex}`}
                          className="border-b border-purple-100 bg-purple-50/50 hover:bg-purple-100/50"
                        >
                          <td className="py-2 px-2 font-medium text-purple-800">
                            BNW-{itemNumber.replace(/#?AIS-?/g, "")}-S{stubIndex + 1}
                          </td>
                          <td className="py-2 px-2 text-purple-700 text-xs">
                            Stub {stubIndex + 1}: {stubBnwInfo.boltSize} BNW Set x
                            {stubBnwInfo.holesPerFlange} (1 each) - {stubNb}NB {flangeSpec}
                          </td>
                          <td className="py-2 px-2 text-center text-purple-600">-</td>
                          {requiredProducts.includes("surface_protection") && (
                            <td className="py-2 px-2 text-center text-purple-600">-</td>
                          )}
                          {requiredProducts.includes("surface_protection") && (
                            <td className="py-2 px-2 text-center text-purple-600">-</td>
                          )}
                          <td className="py-2 px-2 text-center font-medium text-purple-800">
                            {qty}
                          </td>
                          <td className="py-2 px-2 text-right text-purple-700">
                            {formatWeight(stubBnwWeightPerSet)}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-purple-800">
                            {formatWeight(stubBnwTotalWeight)}
                          </td>
                        </tr>
                      );
                    })}
                  {/* Stub Gasket Line Items - only for bends with stubs */}
                  {showBnw &&
                    totalStubFlanges > 0 &&
                    globalSpecs?.gasketType &&
                    entry.itemType === "bend" &&
                    entry.specs?.stubs?.map((stub: any, stubIndex: number) => {
                      if (!stub?.nominalBoreMm) return null;
                      const stubNb = stub.nominalBoreMm;
                      const stubGasketWeight = gasketWeightLookup(
                        allGaskets,
                        globalSpecs.gasketType!,
                        stubNb,
                      );
                      const stubGasketTotalWeight = stubGasketWeight * qty;
                      return (
                        <tr
                          key={`stub-gas-${stubIndex}`}
                          className="border-b border-teal-100 bg-teal-50/50 hover:bg-teal-100/50"
                        >
                          <td className="py-2 px-2 font-medium text-teal-800">
                            GAS-{itemNumber.replace(/#?AIS-?/g, "")}-S{stubIndex + 1}
                          </td>
                          <td className="py-2 px-2 text-teal-700 text-xs">
                            Stub {stubIndex + 1}: {globalSpecs.gasketType} Gasket (1 each) -{" "}
                            {stubNb}NB {flangeSpec}
                          </td>
                          <td className="py-2 px-2 text-center text-teal-600">-</td>
                          {requiredProducts.includes("surface_protection") && (
                            <td className="py-2 px-2 text-center text-teal-600">-</td>
                          )}
                          {requiredProducts.includes("surface_protection") && (
                            <td className="py-2 px-2 text-center text-teal-600">-</td>
                          )}
                          <td className="py-2 px-2 text-center font-medium text-teal-800">{qty}</td>
                          <td className="py-2 px-2 text-right text-teal-700">
                            {stubGasketWeight.toFixed(2)} kg
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-teal-800">
                            {stubGasketTotalWeight.toFixed(2)} kg
                          </td>
                        </tr>
                      );
                    })}
                  {/* Blank Flange Line Items - for any item type with addBlankFlange enabled */}
                  {entry.specs?.addBlankFlange &&
                    (() => {
                      const rawNominalDiameterMm3 = entry.specs?.nominalDiameterMm;
                      const rawNominalBoreMm8 = entry.specs?.nominalBoreMm;
                      // Get nominal bore based on item type
                      const rawNominalBoreMmForBlank = entry.specs?.nominalBoreMm;
                      const blankNb =
                        entry.itemType === "fitting"
                          ? rawNominalDiameterMm3 || rawNominalBoreMmForBlank || 100
                          : rawNominalBoreMm8 || 100;
                      const rawBlankFlangeCount = entry.specs?.blankFlangeCount;
                      const blankFlangeCount = rawBlankFlangeCount || 1;
                      const blankFlangeWeightKg = sansBlankFlangeWeight(
                        allWeights,
                        blankNb,
                        pressureClass || "PN16",
                      );
                      const blankFlangeArea = blankFlangeSurfaceArea(FLANGE_OD, blankNb);
                      const totalBlankFlanges = blankFlangeCount * qty;
                      const totalBlankWeight = blankFlangeWeightKg * totalBlankFlanges;

                      return (
                        <tr className="border-b border-red-100 bg-red-50/50 hover:bg-red-100/50">
                          <td className="py-2 px-2 font-medium text-red-800">
                            BKF-{itemNumber.replace(/#?AIS-?/g, "")}
                          </td>
                          <td className="py-2 px-2 text-red-700 text-xs">
                            Blank Flange ({blankFlangeCount} per item) - {blankNb}NB {flangeSpec}
                          </td>
                          <td className="py-2 px-2 text-center text-red-600">-</td>
                          {requiredProducts.includes("surface_protection") && (
                            <td className="py-2 px-2 text-center text-red-700 text-xs">
                              {blankFlangeArea.external.toFixed(3)}
                            </td>
                          )}
                          {requiredProducts.includes("surface_protection") && (
                            <td className="py-2 px-2 text-center text-red-700 text-xs">
                              {blankFlangeArea.internal.toFixed(3)}
                            </td>
                          )}
                          <td className="py-2 px-2 text-center font-medium text-red-800">
                            {totalBlankFlanges}
                          </td>
                          <td className="py-2 px-2 text-right text-red-700">
                            {formatWeight(blankFlangeWeightKg)}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-red-800">
                            {formatWeight(totalBlankWeight)}
                          </td>
                        </tr>
                      );
                    })()}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-blue-400 bg-blue-100">
              <td className="py-2 px-2 font-bold text-blue-900" colSpan={2}>
                TOTAL
              </td>
              <td className="py-2 px-2"></td>
              {requiredProducts.includes("surface_protection") && <td className="py-2 px-2"></td>}
              {requiredProducts.includes("surface_protection") && <td className="py-2 px-2"></td>}
              <td className="py-2 px-2 text-center font-bold text-blue-900">
                {(() => {
                  const showBnw = requiredProducts?.includes("fasteners_gaskets");
                  let totalQty = 0;

                  entries.forEach((entry: any) => {
                    const rawCalculatedPipeCount3 = entry.calculation?.calculatedPipeCount;
                    const rawQuantityValue3 = entry.specs?.quantityValue;
                    const qty = rawCalculatedPipeCount3 || rawQuantityValue3 || 0;
                    // Add base item quantity
                    totalQty += qty;

                    // Check if item has flanges
                    let hasFlanges = false;
                    let flangeCount = 0;
                    if (entry.itemType === "straight_pipe" || !entry.itemType) {
                      const rawPipeEndConfiguration9 = entry.specs?.pipeEndConfiguration;
                      const pipeEndConfig = rawPipeEndConfiguration9 || "PE";
                      hasFlanges = pipeEndConfig !== "PE";
                    } else if (entry.itemType === "bend") {
                      const rawBendEndConfiguration4 = entry.specs?.bendEndConfiguration;
                      const bendEndConfig = rawBendEndConfiguration4 || "PE";
                      hasFlanges = bendEndConfig !== "PE";
                    } else if (entry.itemType === "fitting") {
                      const rawPipeEndConfiguration10 = entry.specs?.pipeEndConfiguration;
                      const fittingEndConfig = rawPipeEndConfiguration10 || "PE";
                      // Count flanges based on configuration
                      if (fittingEndConfig === "F2E") flangeCount = 2;
                      else if (fittingEndConfig === "F2E_LF") flangeCount = 2;
                      else if (fittingEndConfig === "F2E_RF") flangeCount = 2;
                      else if (fittingEndConfig === "3X_RF") flangeCount = 3;
                      else if (fittingEndConfig === "2X_RF_FOE") flangeCount = 3;
                      else if (fittingEndConfig !== "PE") flangeCount = 1;
                      hasFlanges = flangeCount > 0;
                    }

                    // Add BNW set (using bolt set count: 2 same-sized ends = 1 bolt set)
                    if (showBnw && hasFlanges) {
                      let boltSetCount = 0;
                      if (entry.itemType === "straight_pipe" || !entry.itemType) {
                        const rawPipeEndConfiguration11 = entry.specs?.pipeEndConfiguration;
                        const pipeEndConfig = rawPipeEndConfiguration11 || "PE";
                        boltSetCount = getBoltSetCountPerPipe(pipeEndConfig);
                      } else if (entry.itemType === "bend") {
                        const rawBendEndConfiguration5 = entry.specs?.bendEndConfiguration;
                        const bendEndConfig = rawBendEndConfiguration5 || "PE";
                        boltSetCount = getBoltSetCountPerBend(bendEndConfig);
                        if (entry.specs?.bendItemType === "SWEEP_TEE" && boltSetCount > 0) {
                          boltSetCount += 1;
                        }
                      } else if (entry.itemType === "fitting") {
                        const rawPipeEndConfiguration12 = entry.specs?.pipeEndConfiguration;
                        const fittingEndConfig = rawPipeEndConfiguration12 || "PE";
                        const rawNominalDiameterMm4 = entry.specs?.nominalDiameterMm;
                        const mainNb = rawNominalDiameterMm4 || 100;
                        const branchNb = getFittingBranchNbMm(entry.specs) || mainNb;
                        const fittingBoltSets = getBoltSetCountPerFitting(
                          fittingEndConfig,
                          mainNb === branchNb,
                        );
                        boltSetCount =
                          fittingBoltSets.mainBoltSets + fittingBoltSets.branchBoltSets;
                      }
                      totalQty += boltSetCount * qty;
                    }

                    // Add Gasket (same as bolt sets)
                    if (showBnw && hasFlanges && globalSpecs?.gasketType) {
                      let boltSetCount = 0;
                      if (entry.itemType === "straight_pipe" || !entry.itemType) {
                        const rawPipeEndConfiguration13 = entry.specs?.pipeEndConfiguration;
                        const pipeEndConfig = rawPipeEndConfiguration13 || "PE";
                        boltSetCount = getBoltSetCountPerPipe(pipeEndConfig);
                      } else if (entry.itemType === "bend") {
                        const rawBendEndConfiguration6 = entry.specs?.bendEndConfiguration;
                        const bendEndConfig = rawBendEndConfiguration6 || "PE";
                        boltSetCount = getBoltSetCountPerBend(bendEndConfig);
                        if (entry.specs?.bendItemType === "SWEEP_TEE" && boltSetCount > 0) {
                          boltSetCount += 1;
                        }
                      } else if (entry.itemType === "fitting") {
                        const rawPipeEndConfiguration14 = entry.specs?.pipeEndConfiguration;
                        const fittingEndConfig = rawPipeEndConfiguration14 || "PE";
                        const rawNominalDiameterMm5 = entry.specs?.nominalDiameterMm;
                        const mainNb = rawNominalDiameterMm5 || 100;
                        const branchNb = getFittingBranchNbMm(entry.specs) || mainNb;
                        const fittingBoltSets = getBoltSetCountPerFitting(
                          fittingEndConfig,
                          mainNb === branchNb,
                        );
                        boltSetCount =
                          fittingBoltSets.mainBoltSets + fittingBoltSets.branchBoltSets;
                      }
                      totalQty += boltSetCount * qty;
                    }

                    // Add stub BNW and gaskets for bends
                    if (showBnw && entry.itemType === "bend" && entry.specs?.stubs?.length > 0) {
                      const stubCount = entry.specs.stubs.filter(
                        (s: any) => s?.nominalBoreMm,
                      ).length;
                      // Stub BNW sets
                      totalQty += stubCount * qty;
                      if (globalSpecs?.gasketType) {
                        // Stub gaskets
                        totalQty += stubCount * qty;
                      }
                    }

                    // Add blank flanges
                    if (entry.specs?.addBlankFlange) {
                      const rawBlankFlangeCount2 = entry.specs.blankFlangeCount;
                      totalQty += (rawBlankFlangeCount2 || 1) * qty;
                    }
                  });

                  return totalQty;
                })()}
              </td>
              <td className="py-2 px-2"></td>
              <td className="py-2 px-2 text-right font-bold text-blue-900">
                {formatWeight(getTotalWeight())}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export const ProjectSummaryTable = memo(ProjectSummaryTableInner);
