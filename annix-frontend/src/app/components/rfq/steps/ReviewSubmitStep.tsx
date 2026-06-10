"use client";

import { toPairs as entries, keys, values } from "es-toolkit/compat";
import {
  weldCountPerBend as getWeldCountPerBend,
  weldCountPerFitting as getWeldCountPerFitting,
  weldCountPerPipe as getWeldCountPerPipe,
} from "@/app/lib/config/rfq";
import { useAllBnwSetWeights, useNbToOdMap } from "@/app/lib/query/hooks";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import { ReviewItemsSummary } from "./review/ReviewItemsSummary";

export default function ReviewSubmitStep(props: {
  onNextStep: () => void;
  onPrevStep: () => void;
}) {
  const { onNextStep, onPrevStep } = props;
  const rfqData = useRfqWizardStore((s) => s.rfqData) as any;
  const errors = useRfqWizardStore((s) => s.validationErrors);
  const loading = useRfqWizardStore((s) => s.isSubmitting);
  const { data: nbToOdMap = {} } = useNbToOdMap();
  const { data: allBnwSets = [] } = useAllBnwSetWeights();

  const rawItems = rfqData.items;

  const allItems = rawItems || rfqData.straightPipeEntries || [];

  const getTotalWeight = () => {
    return allItems.reduce((total: number, entry: any) => {
      const rawTotalWeight = entry.calculation?.totalWeight;
      const rawTotalSystemWeight = entry.calculation?.totalSystemWeight;
      // Bends and fittings use totalWeight, straight pipes use totalSystemWeight
      const weight =
        entry.itemType === "bend" || entry.itemType === "fitting"
          ? rawTotalWeight || 0
          : rawTotalSystemWeight || 0;
      return total + weight;
    }, 0);
  };

  const getTotalLength = () => {
    return allItems.reduce((total: number, entry: any) => {
      const rawQuantityValue = entry.specs?.quantityValue;
      const qty = rawQuantityValue || 1;

      if (entry.itemType === "bend") {
        const rawNominalBoreMm = entry.specs?.nominalBoreMm;
        // For bends: include arc length and tangent lengths, but NOT stub lengths
        const nb = rawNominalBoreMm || 0;
        const rawBendType = entry.specs?.bendType;
        const bendRadiusType = rawBendType || "1.5D";
        const radiusFactor = parseFloat(bendRadiusType.replace("D", "")) || 1.5;
        const bendRadiusMm = nb * radiusFactor;
        const rawBendDegrees = entry.specs?.bendDegrees;
        const bendAngleRad = ((rawBendDegrees || 90) * Math.PI) / 180;
        const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;

        const rawTangentLengths = entry.specs?.tangentLengths;

        // Add tangent lengths (but not stubs)
        const tangents = rawTangentLengths || [];
        const tangentLengthM =
          tangents.reduce((sum: number, t: number) => sum + (t || 0), 0) / 1000;

        return total + (arcLengthM + tangentLengthM) * qty;
      }

      if (entry.itemType === "fitting") {
        const rawPipeLengthAMm = entry.specs?.pipeLengthAMm;
        // For fittings (tees/laterals): include pipeLengthA + pipeLengthB
        const lengthAMm = rawPipeLengthAMm || 0;
        const rawPipeLengthBMm = entry.specs?.pipeLengthBMm;
        const lengthBMm = rawPipeLengthBMm || 0;
        const totalLengthM = (lengthAMm + lengthBMm) / 1000;
        return total + totalLengthM * qty;
      }

      // For straight pipes, calculate total length based on quantityType
      if (entry.specs.quantityType === "total_length") {
        const rawQuantityValue2 = entry.specs.quantityValue;
        return total + (rawQuantityValue2 || 0);
      } else {
        const rawQuantityValue3 = entry.specs.quantityValue;
        // number_of_pipes: multiply by individual pipe length
        const numPipes = rawQuantityValue3 || 1;
        const rawIndividualPipeLength = entry.specs.individualPipeLength;
        const pipeLength = rawIndividualPipeLength || 0;
        return total + numPipes * pipeLength;
      }
    }, 0);
  };

  // Calculate total surface areas for all items
  const getTotalSurfaceAreas = () => {
    let totalExternal = 0;
    let totalInternal = 0;

    allItems.forEach((entry: any) => {
      const rawCalculatedPipeCount = entry.calculation?.calculatedPipeCount;
      const specsQuantityValue = entry.specs?.quantityValue;
      const qty = rawCalculatedPipeCount || specsQuantityValue || 1;

      if (entry.itemType === "bend") {
        // Bend surface area calculation
        const nb = entry.specs?.nominalBoreMm;
        const rawWallThicknessMm = entry.specs?.wallThicknessMm;
        const wt = rawWallThicknessMm || entry.calculation?.wallThicknessMm;
        const rawNb = nbToOdMap[nb];
        const od = rawNb || nb * 1.05;
        const id = od - 2 * wt;
        const odM = od / 1000;
        const idM = id / 1000;

        const rawBendType2 = entry.specs?.bendType;

        const bendRadiusType = rawBendType2 || "1.5D";
        const radiusFactor = parseFloat(bendRadiusType.replace("D", "")) || 1.5;
        const bendRadiusMm = nb * radiusFactor;
        const rawBendDegrees2 = entry.specs?.bendDegrees;
        const bendAngleRad = ((rawBendDegrees2 || 90) * Math.PI) / 180;
        const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;

        let extArea = odM * Math.PI * arcLengthM;
        let intArea = idM * Math.PI * arcLengthM;

        const rawTangentLengths2 = entry.specs?.tangentLengths;

        // Add tangents
        const tangents = rawTangentLengths2 || [];
        tangents.forEach((t: number) => {
          if (t > 0) {
            const tM = t / 1000;
            extArea += odM * Math.PI * tM;
            intArea += idM * Math.PI * tM;
          }
        });

        totalExternal += extArea * qty;
        totalInternal += intArea * qty;
      } else if (entry.itemType === "fitting") {
        // Fitting (tee) surface area calculation - match calc results logic
        const nb = entry.specs?.nominalDiameterMm;
        const rawBranchNominalDiameterMm = entry.specs?.branchNominalDiameterMm;
        const branchNb = rawBranchNominalDiameterMm || nb;
        const rawWallThicknessMm2 = entry.specs?.wallThicknessMm;
        const calcWallThicknessMm = entry.calculation?.wallThicknessMm;
        const wt = rawWallThicknessMm2 || calcWallThicknessMm || 6;
        const rawPipeLengthAMm2 = entry.specs?.pipeLengthAMm;
        const lengthA = rawPipeLengthAMm2 || 0;
        const rawPipeLengthBMm2 = entry.specs?.pipeLengthBMm;
        const lengthB = rawPipeLengthBMm2 || 0;
        const rawTeeHeightMm = entry.specs?.teeHeightMm;
        const teeHeight = rawTeeHeightMm || 0;
        const rawPipeEndConfiguration = entry.specs?.pipeEndConfiguration;
        const pipeEndConfig = rawPipeEndConfiguration || "PE";

        // Determine flange configuration for 100mm allowance
        const FLANGE_ALLOWANCE_MM = 100;
        let mainEndCount = 0;
        let branchEndCount = 0;

        // Count main pipe ends (inlet/outlet)
        if (["FBE", "FOE_RF", "2X_RF"].includes(pipeEndConfig)) {
          mainEndCount = 2;
        } else if (pipeEndConfig !== "PE") {
          mainEndCount = 1;
        }
        // Count branch end
        if (entry.specs?.branchFlangeType && entry.specs?.branchFlangeType !== "none") {
          branchEndCount = 1;
        }

        if (nb && (lengthA || lengthB || teeHeight)) {
          const rawOutsideDiameterMm = entry.calculation?.outsideDiameterMm;
          const nbOd = nbToOdMap[nb];
          const mainOd = rawOutsideDiameterMm || nbOd || nb * 1.1;
          const rawBranchNb = nbToOdMap[branchNb];
          const branchOd = rawBranchNb || branchNb * 1.1;
          const mainId = mainOd - 2 * wt;
          const branchId = branchOd - 2 * wt;

          // Add 100mm allowance per end
          const mainEndAllowance = (mainEndCount * FLANGE_ALLOWANCE_MM) / 1000;
          const branchEndAllowance = (branchEndCount * FLANGE_ALLOWANCE_MM) / 1000;

          const runLengthM = (lengthA + lengthB) / 1000 + mainEndAllowance;
          const branchLengthM = teeHeight / 1000 + branchEndAllowance;

          const runExt = (mainOd / 1000) * Math.PI * runLengthM;
          const branchExt = branchLengthM > 0 ? (branchOd / 1000) * Math.PI * branchLengthM : 0;

          const runInt = (mainId / 1000) * Math.PI * runLengthM;
          const branchInt = branchLengthM > 0 ? (branchId / 1000) * Math.PI * branchLengthM : 0;

          totalExternal += (runExt + branchExt) * qty;
          totalInternal += (runInt + branchInt) * qty;
        }
      } else {
        // Straight pipe surface area
        if (entry.calculation?.outsideDiameterMm && entry.specs?.wallThicknessMm) {
          const od = entry.calculation.outsideDiameterMm;
          const id = od - 2 * entry.specs.wallThicknessMm;
          const rawIndividualPipeLength2 = entry.specs.individualPipeLength;
          const lengthM = rawIndividualPipeLength2 || 0;
          const rawCalculatedPipeCount2 = entry.calculation?.calculatedPipeCount;
          const pipeCount = rawCalculatedPipeCount2 || qty;

          totalExternal += (od / 1000) * Math.PI * lengthM * pipeCount;
          totalInternal += (id / 1000) * Math.PI * lengthM * pipeCount;
        }
      }
    });

    return { external: totalExternal, internal: totalInternal };
  };

  const hasSurfaceProtection = rfqData.requiredProducts?.includes("surface_protection");

  const rawRequiredDate = rfqData.requiredDate;
  const rawCustomerEmail = rfqData.customerEmail;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Review & Submit RFQ</h2>
      <div className="space-y-8">
        {/* Project Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Project Name</p>
              <p className="font-medium text-gray-900">{rfqData.projectName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-medium text-gray-900">{rfqData.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Required Date</p>
              <p className="font-medium text-gray-900">{rawRequiredDate || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact Email</p>
              <p className="font-medium text-gray-900">{rawCustomerEmail || "Not provided"}</p>
            </div>
          </div>
          {rfqData.description && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">Description</p>
              <p className="font-medium text-gray-900">{rfqData.description}</p>
            </div>
          )}
        </div>

        {/* All Items Summary */}
        <ReviewItemsSummary
          allItems={allItems}
          rfqData={rfqData}
          nbToOdMap={nbToOdMap}
          allBnwSets={allBnwSets}
        />
        {/* Total Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            Total Summary (All Items Combined)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Total Entries</p>
              <p className="text-2xl font-bold text-blue-900">{allItems.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Total Length</p>
              <p className="text-2xl font-bold text-blue-900">{getTotalLength().toFixed(1)} m</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Total Weight</p>
              <p className="text-2xl font-bold text-blue-900">{getTotalWeight().toFixed(2)} kg</p>
            </div>
            {/* Total Weld Length */}
            {(() => {
              let totalWeldLengthM = 0;
              let totalWeldCount = 0;
              allItems.forEach((entry: any) => {
                const rawQuantityValue13 = entry.specs?.quantityValue;
                const qty = rawQuantityValue13 || 1;
                let itemQty = qty;
                if (
                  entry.itemType !== "bend" &&
                  entry.itemType !== "fitting" &&
                  entry.specs?.quantityType === "total_length"
                ) {
                  itemQty = 1;
                }
                if (entry.itemType === "bend") {
                  const nb = entry.specs?.nominalBoreMm;
                  const rawBendEndConfiguration4 = entry.specs?.bendEndConfiguration;
                  const bendEndConfig = rawBendEndConfiguration4 || "PE";
                  const flangeConnections = getWeldCountPerBend(bendEndConfig);
                  if (nb && flangeConnections > 0) {
                    const rawNb7 = nbToOdMap[nb];
                    const od = rawNb7 || nb * 1.05;
                    // Each flange connection has 2 welds (inside + outside), so x2
                    const weldsPerFlange = 2;
                    totalWeldLengthM +=
                      ((flangeConnections * weldsPerFlange * Math.PI * od) / 1000) * itemQty;
                    totalWeldCount += flangeConnections * weldsPerFlange * itemQty;
                  }
                } else if (entry.itemType === "fitting") {
                  const nb = entry.specs?.nominalDiameterMm;
                  const rawBranchNominalDiameterMm6 = entry.specs?.branchNominalDiameterMm;
                  const branchNb = rawBranchNominalDiameterMm6 || nb;
                  const rawPipeEndConfiguration8 = entry.specs?.pipeEndConfiguration;
                  const fittingEndConfig = rawPipeEndConfiguration8 || "PE";
                  const flangeConnections = getWeldCountPerFitting(fittingEndConfig);
                  if (nb && flangeConnections > 0) {
                    const rawNb8 = nbToOdMap[nb];
                    const mainOd = rawNb8 || nb * 1.05;
                    const rawBranchNb4 = nbToOdMap[branchNb];
                    const branchOd = rawBranchNb4 || branchNb * 1.05;
                    // Each flange connection has 2 welds (inside + outside), so x2
                    const weldsPerFlange = 2;
                    let linearMm = 0;
                    if (flangeConnections >= 3)
                      linearMm = (2 * Math.PI * mainOd + Math.PI * branchOd) * weldsPerFlange;
                    else if (flangeConnections === 2)
                      linearMm = 2 * Math.PI * mainOd * weldsPerFlange;
                    else linearMm = Math.PI * mainOd * weldsPerFlange;
                    totalWeldLengthM += (linearMm / 1000) * itemQty;
                    totalWeldCount += flangeConnections * weldsPerFlange * itemQty;
                  }
                } else {
                  const nb = entry.specs?.nominalBoreMm;
                  const rawPipeEndConfiguration9 = entry.specs?.pipeEndConfiguration;
                  const pipeEndConfig = rawPipeEndConfiguration9 || "PE";
                  const flangeConnections = getWeldCountPerPipe(pipeEndConfig);
                  if (nb && flangeConnections > 0) {
                    const rawNb9 = nbToOdMap[nb];
                    const od = rawNb9 || nb * 1.05;
                    // Each flange connection has 2 welds (inside + outside), so x2
                    const weldsPerFlange = 2;
                    totalWeldLengthM +=
                      ((flangeConnections * weldsPerFlange * Math.PI * od) / 1000) * itemQty;
                    totalWeldCount += flangeConnections * weldsPerFlange * itemQty;
                  }
                }
              });
              if (totalWeldCount === 0) return null;
              return (
                <div className="text-center">
                  <p className="text-sm font-medium text-purple-700">Total Welds</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {totalWeldLengthM.toFixed(1)} m
                  </p>
                  <p className="text-xs text-purple-600">({totalWeldCount} welds)</p>
                </div>
              );
            })()}
            {/* Total Flanges */}
            {(() => {
              const flangesBySize: Record<string, number> = {};
              allItems.forEach((entry: any) => {
                const rawQuantityValue14 = entry.specs?.quantityValue;
                const qty = rawQuantityValue14 || 1;
                let itemQty = qty;
                if (
                  entry.itemType !== "bend" &&
                  entry.itemType !== "fitting" &&
                  entry.specs?.quantityType === "total_length"
                ) {
                  itemQty = 1;
                }
                if (entry.itemType === "bend") {
                  const nb = entry.specs?.nominalBoreMm;
                  const rawBendEndConfiguration5 = entry.specs?.bendEndConfiguration;
                  const bendEndConfig = rawBendEndConfiguration5 || "PE";
                  if (bendEndConfig !== "PE") {
                    const flangeCount =
                      bendEndConfig === "FBE"
                        ? 2
                        : bendEndConfig === "2xLF" ||
                            bendEndConfig === "2X_RF" ||
                            bendEndConfig === "FOE_LF" ||
                            bendEndConfig === "FOE_RF"
                          ? 2
                          : 1;
                    const key = `${nb}NB`;
                    const rawKey = flangesBySize[key];
                    flangesBySize[key] = (rawKey || 0) + flangeCount * itemQty;
                  }
                } else if (entry.itemType === "fitting") {
                  const nb = entry.specs?.nominalDiameterMm;
                  const rawBranchNominalDiameterMm7 = entry.specs?.branchNominalDiameterMm;
                  const branchNb = rawBranchNominalDiameterMm7 || nb;
                  const rawPipeEndConfiguration10 = entry.specs?.pipeEndConfiguration;
                  const fittingEndConfig = rawPipeEndConfiguration10 || "PE";
                  if (fittingEndConfig !== "PE") {
                    const config = fittingEndConfig.split("");
                    let mainFlanges = 0,
                      branchFlanges = 0;
                    if (config[0] === "F") mainFlanges++;
                    if (config[1] === "F") mainFlanges++;
                    if (config[2] === "F") branchFlanges++;
                    if (mainFlanges > 0) {
                      const key = `${nb}NB`;
                      const rawKey2 = flangesBySize[key];
                      flangesBySize[key] = (rawKey2 || 0) + mainFlanges * itemQty;
                    }
                    if (branchFlanges > 0) {
                      const key = `${branchNb}NB`;
                      const rawKey3 = flangesBySize[key];
                      flangesBySize[key] = (rawKey3 || 0) + branchFlanges * itemQty;
                    }
                  }
                } else {
                  const nb = entry.specs?.nominalBoreMm;
                  const rawPipeEndConfiguration11 = entry.specs?.pipeEndConfiguration;
                  const pipeEndConfig = rawPipeEndConfiguration11 || "PE";
                  if (pipeEndConfig !== "PE") {
                    const flangeCount =
                      pipeEndConfig === "FBE"
                        ? 2
                        : pipeEndConfig === "2xLF" ||
                            pipeEndConfig === "2X_RF" ||
                            pipeEndConfig === "FOE_LF" ||
                            pipeEndConfig === "FOE_RF"
                          ? 2
                          : 1;
                    const key = `${nb}NB`;
                    const rawKey4 = flangesBySize[key];
                    flangesBySize[key] = (rawKey4 || 0) + flangeCount * itemQty;
                  }
                }
              });
              const totalFlanges = values(flangesBySize).reduce((sum, count) => sum + count, 0);
              if (totalFlanges === 0) return null;
              const rawPressureClassDesignation5 = rfqData.globalSpecs?.pressureClassDesignation;
              const pressureClass = rawPressureClassDesignation5 || "PN16";
              return (
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-700">Total Flanges</p>
                  <p className="text-2xl font-bold text-blue-900">{totalFlanges}</p>
                  <p className="text-xs text-blue-600">{pressureClass}</p>
                </div>
              );
            })()}
            {hasSurfaceProtection &&
              (() => {
                const surfaceAreas = getTotalSurfaceAreas();
                return (
                  <>
                    <div className="text-center">
                      <p className="text-sm font-medium text-indigo-700">External Area</p>
                      <p className="text-2xl font-bold text-indigo-900">
                        {surfaceAreas.external.toFixed(2)} m²
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-indigo-700">Internal Area</p>
                      <p className="text-2xl font-bold text-indigo-900">
                        {surfaceAreas.internal.toFixed(2)} m²
                      </p>
                    </div>
                  </>
                );
              })()}
          </div>
        </div>

        {/* Submit Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              onClick={onPrevStep}
              disabled={loading}
              className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              ← Previous Step
            </button>
            <button
              onClick={onNextStep}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review BOQ →
            </button>
          </div>

          {keys(errors).length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-2">
                Please fix the following errors:
              </p>
              <ul className="text-sm text-red-600 space-y-1">
                {entries(errors).map(([key, message]) => (
                  <li key={key}>• {message as string}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// BOQ (Bill of Quantities) Step - Consolidated view pooling similar items
