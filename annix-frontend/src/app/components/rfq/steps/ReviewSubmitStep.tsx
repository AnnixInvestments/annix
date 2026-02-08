"use client";

import {
  boltSetCountPerBend as getBoltSetCountPerBend,
  boltSetCountPerFitting as getBoltSetCountPerFitting,
  boltSetCountPerPipe as getBoltSetCountPerPipe,
  weldCountPerBend as getWeldCountPerBend,
  weldCountPerFitting as getWeldCountPerFitting,
  weldCountPerPipe as getWeldCountPerPipe,
} from "@/app/lib/config/rfq";
import { bnwSetInfoSync as getBnwSetInfo, NB_TO_OD_LOOKUP } from "@/app/lib/hooks/useFlangeWeights";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";

export default function ReviewSubmitStep({
  onNextStep,
  onPrevStep,
}: {
  onNextStep: () => void;
  onPrevStep: () => void;
}) {
  const rfqData = useRfqWizardStore((s) => s.rfqData) as any;
  const errors = useRfqWizardStore((s) => s.validationErrors);
  const loading = useRfqWizardStore((s) => s.isSubmitting);

  const allItems = rfqData.items || rfqData.straightPipeEntries || [];

  const getTotalWeight = () => {
    return allItems.reduce((total: number, entry: any) => {
      // Bends and fittings use totalWeight, straight pipes use totalSystemWeight
      const weight =
        entry.itemType === "bend" || entry.itemType === "fitting"
          ? entry.calculation?.totalWeight || 0
          : entry.calculation?.totalSystemWeight || 0;
      return total + weight;
    }, 0);
  };

  const getTotalLength = () => {
    return allItems.reduce((total: number, entry: any) => {
      const qty = entry.specs?.quantityValue || 1;

      if (entry.itemType === "bend") {
        // For bends: include arc length and tangent lengths, but NOT stub lengths
        const nb = entry.specs?.nominalBoreMm || 0;
        const bendRadiusType = entry.specs?.bendType || "1.5D";
        const radiusFactor = parseFloat(bendRadiusType.replace("D", "")) || 1.5;
        const bendRadiusMm = nb * radiusFactor;
        const bendAngleRad = ((entry.specs?.bendDegrees || 90) * Math.PI) / 180;
        const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;

        // Add tangent lengths (but not stubs)
        const tangents = entry.specs?.tangentLengths || [];
        const tangentLengthM =
          tangents.reduce((sum: number, t: number) => sum + (t || 0), 0) / 1000;

        return total + (arcLengthM + tangentLengthM) * qty;
      }

      if (entry.itemType === "fitting") {
        // For fittings (tees/laterals): include pipeLengthA + pipeLengthB
        const lengthAMm = entry.specs?.pipeLengthAMm || 0;
        const lengthBMm = entry.specs?.pipeLengthBMm || 0;
        const totalLengthM = (lengthAMm + lengthBMm) / 1000;
        return total + totalLengthM * qty;
      }

      // For straight pipes, calculate total length based on quantityType
      if (entry.specs.quantityType === "total_length") {
        return total + (entry.specs.quantityValue || 0);
      } else {
        // number_of_pipes: multiply by individual pipe length
        const numPipes = entry.specs.quantityValue || 1;
        const pipeLength = entry.specs.individualPipeLength || 0;
        return total + numPipes * pipeLength;
      }
    }, 0);
  };

  // Calculate total surface areas for all items
  const getTotalSurfaceAreas = () => {
    let totalExternal = 0;
    let totalInternal = 0;

    allItems.forEach((entry: any) => {
      const qty = entry.calculation?.calculatedPipeCount || entry.specs?.quantityValue || 1;

      if (entry.itemType === "bend") {
        // Bend surface area calculation
        const nb = entry.specs?.nominalBoreMm;
        const wt = entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm;
        const od = NB_TO_OD_LOOKUP[nb] || nb * 1.05;
        const id = od - 2 * wt;
        const odM = od / 1000;
        const idM = id / 1000;

        const bendRadiusType = entry.specs?.bendType || "1.5D";
        const radiusFactor = parseFloat(bendRadiusType.replace("D", "")) || 1.5;
        const bendRadiusMm = nb * radiusFactor;
        const bendAngleRad = ((entry.specs?.bendDegrees || 90) * Math.PI) / 180;
        const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;

        let extArea = odM * Math.PI * arcLengthM;
        let intArea = idM * Math.PI * arcLengthM;

        // Add tangents
        const tangents = entry.specs?.tangentLengths || [];
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
        const branchNb = entry.specs?.branchNominalDiameterMm || nb;
        const wt = entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm || 6;
        const lengthA = entry.specs?.pipeLengthAMm || 0;
        const lengthB = entry.specs?.pipeLengthBMm || 0;
        const teeHeight = entry.specs?.teeHeightMm || 0;
        const pipeEndConfig = entry.specs?.pipeEndConfiguration || "PE";

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
          const mainOd = entry.calculation?.outsideDiameterMm || NB_TO_OD_LOOKUP[nb] || nb * 1.1;
          const branchOd = NB_TO_OD_LOOKUP[branchNb] || branchNb * 1.1;
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
          const lengthM = entry.specs.individualPipeLength || 0;
          const pipeCount = entry.calculation?.calculatedPipeCount || qty;

          totalExternal += (od / 1000) * Math.PI * lengthM * pipeCount;
          totalInternal += (id / 1000) * Math.PI * lengthM * pipeCount;
        }
      }
    });

    return { external: totalExternal, internal: totalInternal };
  };

  const hasSurfaceProtection = rfqData.requiredProducts?.includes("surface_protection");

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
              <p className="font-medium text-gray-900">{rfqData.requiredDate || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact Email</p>
              <p className="font-medium text-gray-900">{rfqData.customerEmail || "Not provided"}</p>
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
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Item Requirements</h3>
          <div className="space-y-4">
            {allItems.map((entry: any, index: number) => (
              <div
                key={`${entry.id}-${entry.itemType}-${index}`}
                className={`border border-gray-100 rounded-lg p-4 ${
                  entry.itemType === "bend"
                    ? "bg-purple-50"
                    : entry.itemType === "fitting"
                      ? "bg-green-50"
                      : "bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        entry.itemType === "bend"
                          ? "bg-purple-200 text-purple-800"
                          : entry.itemType === "fitting"
                            ? "bg-green-200 text-green-800"
                            : "bg-blue-200 text-blue-800"
                      }`}
                    >
                      {entry.itemType === "bend"
                        ? "Bend"
                        : entry.itemType === "fitting"
                          ? "Fitting"
                          : "Pipe"}
                    </span>
                    <h4 className="font-medium text-gray-800">Item #{index + 1}</h4>
                  </div>
                  <span className="text-sm text-gray-600">
                    {entry.calculation
                      ? entry.itemType === "bend" || entry.itemType === "fitting"
                        ? `${entry.calculation.totalWeight?.toFixed(2) || 0} kg`
                        : `${entry.calculation.totalSystemWeight?.toFixed(2) || 0} kg`
                      : "Not calculated"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{entry.description}</p>

                {/* Display fields based on item type */}
                {entry.itemType === "bend" ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                    <div>NB: {entry.specs.nominalBoreMm}mm</div>
                    <div>Angle: {entry.specs.bendDegrees}°</div>
                    <div>Type: {entry.specs.bendType}</div>
                    <div>Qty: {entry.specs.quantityValue || 1}</div>
                    {entry.specs.numberOfTangents > 0 && (
                      <div className="col-span-2">Tangents: {entry.specs.numberOfTangents}</div>
                    )}
                    {entry.specs.numberOfStubs > 0 && (
                      <div className="col-span-2">Stubs: {entry.specs.numberOfStubs}</div>
                    )}
                    <div>
                      Weight/item: {(() => {
                        const totalWt = entry.calculation?.totalWeight || 0;
                        const qty = entry.specs?.quantityValue || 1;
                        return (totalWt / qty).toFixed(2);
                      })()} kg
                    </div>
                    {/* Surface areas for bend - PER ITEM */}
                    {(() => {
                      const nb = entry.specs?.nominalBoreMm;
                      const wt = entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm;
                      if (!nb || !wt) return null;
                      const od = NB_TO_OD_LOOKUP[nb] || nb * 1.05;
                      const id = od - 2 * wt;
                      const bendRadiusType = entry.specs?.bendType || "1.5D";
                      const radiusFactor = parseFloat(bendRadiusType.replace("D", "")) || 1.5;
                      const bendRadiusMm = nb * radiusFactor;
                      const bendAngleRad = ((entry.specs?.bendDegrees || 90) * Math.PI) / 180;
                      const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;
                      let extArea = (od / 1000) * Math.PI * arcLengthM;
                      let intArea = (id / 1000) * Math.PI * arcLengthM;
                      const tangents = entry.specs?.tangentLengths || [];
                      tangents.forEach((t: number) => {
                        if (t > 0) {
                          const tM = t / 1000;
                          extArea += (od / 1000) * Math.PI * tM;
                          intArea += (id / 1000) * Math.PI * tM;
                        }
                      });
                      return (
                        <>
                          <div className="text-indigo-700 font-medium">
                            Ext/item: {extArea.toFixed(3)} m²{" "}
                            <span className="text-indigo-500 font-normal text-[10px]">
                              (arc + tangents)
                            </span>
                          </div>
                          <div className="text-purple-700 font-medium">
                            Int/item: {intArea.toFixed(3)} m²{" "}
                            <span className="text-purple-500 font-normal text-[10px]">
                              (arc + tangents)
                            </span>
                          </div>
                        </>
                      );
                    })()}
                    {/* Weld info for bend - PER ITEM */}
                    {(() => {
                      const nb = entry.specs?.nominalBoreMm;
                      const wt = entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm;
                      const bendEndConfig = entry.specs?.bendEndConfiguration || "PE";
                      const flangeConnections = getWeldCountPerBend(bendEndConfig);
                      if (!nb || !wt || flangeConnections === 0) return null;
                      const od = NB_TO_OD_LOOKUP[nb] || nb * 1.05;
                      const circumferenceMm = Math.PI * od;
                      // x2 because each flanged connection requires 2 welds (inside + outside)
                      const weldsPerConnection = 2;
                      const totalWelds = flangeConnections * weldsPerConnection;
                      const linearWeldMm = totalWelds * circumferenceMm;
                      return (
                        <div className="text-purple-700 col-span-2 font-medium">
                          Welds/item: {totalWelds} ({flangeConnections} flange × 2) @{" "}
                          {circumferenceMm.toFixed(0)}mm circ = {(linearWeldMm / 1000).toFixed(2)}m
                          ({wt.toFixed(1)}mm WT)
                        </div>
                      );
                    })()}
                    {/* Flange breakdown for bend */}
                    {(() => {
                      const nb = entry.specs?.nominalBoreMm;
                      const bendEndConfig = entry.specs?.bendEndConfiguration || "PE";
                      const pressureClass = rfqData.globalSpecs?.pressureClassDesignation || "PN16";
                      if (bendEndConfig === "PE") return null;
                      const flangeCount =
                        bendEndConfig === "FBE"
                          ? 2
                          : ["FOE", "FOE_LF", "FOE_RF", "2xLF", "2X_RF"].includes(bendEndConfig)
                            ? bendEndConfig === "2xLF" || bendEndConfig === "2X_RF"
                              ? 2
                              : bendEndConfig === "FOE_LF" || bendEndConfig === "FOE_RF"
                                ? 2
                                : 1
                            : 1;
                      return (
                        <div className="text-blue-600 col-span-2">
                          Flanges/item: {flangeCount}x {nb}NB {pressureClass}
                        </div>
                      );
                    })()}
                  </div>
                ) : entry.itemType === "fitting" ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                    <div>Type: {entry.specs.fittingType || "N/A"}</div>
                    <div>Standard: {entry.specs.fittingStandard || "N/A"}</div>
                    <div>
                      NB: {entry.specs.nominalDiameterMm}mm
                      {entry.specs.branchNominalDiameterMm &&
                      entry.specs.branchNominalDiameterMm !== entry.specs.nominalDiameterMm
                        ? ` x ${entry.specs.branchNominalDiameterMm}mm`
                        : ""}
                    </div>
                    <div>Qty: {entry.specs.quantityValue || 1}</div>
                    {entry.specs.pipeLengthAMm && (
                      <div>Length A: {entry.specs.pipeLengthAMm}mm</div>
                    )}
                    {entry.specs.pipeLengthBMm && (
                      <div>Length B: {entry.specs.pipeLengthBMm}mm</div>
                    )}
                    <div>
                      Weight/item:{" "}
                      {entry.calculation?.weightPerItem?.toFixed(2) ||
                        (
                          (entry.calculation?.totalWeight || 0) / (entry.specs?.quantityValue || 1)
                        ).toFixed(2) ||
                        "-"}{" "}
                      kg
                    </div>
                    {/* Surface areas for fitting - PER ITEM */}
                    {(() => {
                      const nb = entry.specs?.nominalDiameterMm;
                      const branchNb = entry.specs?.branchNominalDiameterMm || nb;
                      const wt = entry.specs?.wallThicknessMm || 10;
                      const lengthA = entry.specs?.pipeLengthAMm || 0;
                      const lengthB = entry.specs?.pipeLengthBMm || 0;
                      if (!nb || (!lengthA && !lengthB)) return null;
                      const mainOd = NB_TO_OD_LOOKUP[nb] || nb * 1.05;
                      const branchOd = NB_TO_OD_LOOKUP[branchNb] || branchNb * 1.05;
                      const mainId = mainOd - 2 * wt;
                      const branchId = branchOd - 2 * wt;
                      const runLengthM = (lengthA + lengthB) / 1000;
                      const branchLengthM = (branchOd * 2) / 1000;
                      const runExt = (mainOd / 1000) * Math.PI * runLengthM;
                      const branchExt = (branchOd / 1000) * Math.PI * branchLengthM;
                      const overlapExt = (branchOd / 1000) * (wt / 1000) * Math.PI;
                      const runInt = (mainId / 1000) * Math.PI * runLengthM;
                      const branchInt = (branchId / 1000) * Math.PI * branchLengthM;
                      const holeCut = Math.PI * (branchId / 1000 / 2) ** 2;
                      const extArea = runExt + branchExt - overlapExt;
                      const intArea = runInt + branchInt - holeCut;
                      return (
                        <>
                          <div className="text-indigo-700 font-medium">
                            Ext/item: {extArea.toFixed(3)} m²{" "}
                            <span className="text-indigo-500 font-normal text-[10px]">
                              (run + branch - overlap)
                            </span>
                          </div>
                          <div className="text-purple-700 font-medium">
                            Int/item: {intArea.toFixed(3)} m²{" "}
                            <span className="text-purple-500 font-normal text-[10px]">
                              (run + branch - hole)
                            </span>
                          </div>
                        </>
                      );
                    })()}
                    {/* Weld info for fitting - PER ITEM */}
                    {(() => {
                      const nb = entry.specs?.nominalDiameterMm;
                      const branchNb = entry.specs?.branchNominalDiameterMm || nb;
                      const wt = entry.specs?.wallThicknessMm || 10;
                      const fittingEndConfig = entry.specs?.pipeEndConfiguration || "PE";
                      const weldCount = getWeldCountPerFitting(fittingEndConfig);
                      if (!nb || weldCount === 0) return null;
                      const mainOd = NB_TO_OD_LOOKUP[nb] || nb * 1.05;
                      const branchOd = NB_TO_OD_LOOKUP[branchNb] || branchNb * 1.05;
                      // For tees: 2 welds on main run + 1 weld on branch
                      // Total linear = 2 × main circ + 1 × branch circ
                      const mainCirc = Math.PI * mainOd;
                      const branchCirc = Math.PI * branchOd;
                      // Estimate: for FFF (3 flanges) = 3 welds, distribute proportionally
                      let linearWeldMm = 0;
                      if (weldCount >= 3) {
                        linearWeldMm = 2 * mainCirc + branchCirc; // 2 main + 1 branch
                      } else if (weldCount === 2) {
                        linearWeldMm = 2 * mainCirc; // 2 main welds
                      } else {
                        linearWeldMm = mainCirc; // 1 main weld
                      }
                      return (
                        <div className="text-purple-600 col-span-2">
                          Welds/item: {weldCount} = {(linearWeldMm / 1000).toFixed(2)}m (
                          {wt.toFixed(1)}mm WT)
                        </div>
                      );
                    })()}
                    {/* Flange breakdown for fitting */}
                    {(() => {
                      const nb = entry.specs?.nominalDiameterMm;
                      const branchNb = entry.specs?.branchNominalDiameterMm || nb;
                      const fittingEndConfig = entry.specs?.pipeEndConfiguration || "PE";
                      const pressureClass = rfqData.globalSpecs?.pressureClassDesignation || "PN16";
                      if (fittingEndConfig === "PE") return null;
                      // Parse fitting config for flanges
                      const config = fittingEndConfig.split("");
                      let mainFlanges = 0;
                      let branchFlanges = 0;
                      // Inlet (pos 0), Outlet (pos 1), Branch (pos 2)
                      if (config[0] === "F") mainFlanges++;
                      if (config[1] === "F") mainFlanges++;
                      if (config[2] === "F") branchFlanges++;
                      const flangeText = [];
                      if (mainFlanges > 0)
                        flangeText.push(`${mainFlanges}x ${nb}NB ${pressureClass}`);
                      if (branchFlanges > 0)
                        flangeText.push(`${branchFlanges}x ${branchNb}NB ${pressureClass}`);
                      if (flangeText.length === 0) return null;
                      return (
                        <div className="text-blue-600 col-span-2">
                          Flanges/item: {flangeText.join(" + ")}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                    <div>NB: {entry.specs.nominalBoreMm}mm</div>
                    <div>
                      Schedule:{" "}
                      {entry.specs.scheduleNumber || `${entry.specs.wallThicknessMm}mm WT`}
                    </div>
                    <div>
                      Length/pipe: {(() => {
                        // Show per-pipe length
                        if (entry.specs.quantityType === "total_length") {
                          return Number(entry.specs.quantityValue || 0).toFixed(3);
                        } else {
                          return (entry.specs.individualPipeLength || 0).toFixed(3);
                        }
                      })()}m
                    </div>
                    <div>
                      Qty: {(() => {
                        if (entry.specs.quantityType === "total_length") return "1";
                        return entry.specs.quantityValue || 1;
                      })()}
                    </div>
                    <div>
                      Weight/pipe: {(() => {
                        const totalWt = entry.calculation?.totalSystemWeight || 0;
                        if (entry.specs.quantityType === "total_length") return totalWt.toFixed(2);
                        const qty = entry.specs.quantityValue || 1;
                        return (totalWt / qty).toFixed(2);
                      })()} kg
                    </div>
                    {/* Surface areas for straight pipe - PER PIPE with calculation breakdown */}
                    {(() => {
                      const od = entry.calculation?.outsideDiameterMm;
                      const wt = entry.specs?.wallThicknessMm;
                      if (!od || !wt) return null;
                      const id = od - 2 * wt;
                      // Per-pipe length
                      let perPipeLengthM = 0;
                      if (entry.specs.quantityType === "total_length") {
                        perPipeLengthM = entry.specs.quantityValue || 0;
                      } else {
                        perPipeLengthM = entry.specs.individualPipeLength || 0;
                      }
                      const extArea = (od / 1000) * Math.PI * perPipeLengthM;
                      const intArea = (id / 1000) * Math.PI * perPipeLengthM;
                      return (
                        <>
                          <div className="text-indigo-700 font-medium">
                            Ext/pipe: {extArea.toFixed(3)} m²{" "}
                            <span className="text-indigo-500 font-normal text-[10px]">
                              ({od.toFixed(0)}mm × π × {perPipeLengthM.toFixed(2)}m)
                            </span>
                          </div>
                          <div className="text-purple-700 font-medium">
                            Int/pipe: {intArea.toFixed(3)} m²{" "}
                            <span className="text-purple-500 font-normal text-[10px]">
                              ({id.toFixed(0)}mm × π × {perPipeLengthM.toFixed(2)}m)
                            </span>
                          </div>
                        </>
                      );
                    })()}
                    {/* Weld info for pipe - PER PIPE (x2 for inside + outside welds per flange) */}
                    {(() => {
                      const nb = entry.specs?.nominalBoreMm;
                      const wt = entry.specs?.wallThicknessMm;
                      const pipeEndConfig = entry.specs?.pipeEndConfiguration || "PE";
                      const flangeConnections = getWeldCountPerPipe(pipeEndConfig); // Number of flanged connections
                      if (!nb || !wt || flangeConnections === 0) return null;
                      const od = NB_TO_OD_LOOKUP[nb] || nb * 1.05;
                      const circumferenceMm = Math.PI * od;
                      // x2 because each flanged connection requires 2 welds (inside + outside)
                      const weldsPerConnection = 2;
                      const totalWelds = flangeConnections * weldsPerConnection;
                      const linearWeldMm = totalWelds * circumferenceMm;
                      return (
                        <div className="text-purple-700 col-span-2 font-medium">
                          Welds/pipe: {totalWelds} ({flangeConnections} flange × 2) @{" "}
                          {circumferenceMm.toFixed(0)}mm circ = {(linearWeldMm / 1000).toFixed(2)}m
                          ({wt.toFixed(1)}mm WT)
                        </div>
                      );
                    })()}
                    {/* Flange breakdown for pipe */}
                    {(() => {
                      const nb = entry.specs?.nominalBoreMm;
                      const pipeEndConfig = entry.specs?.pipeEndConfiguration || "PE";
                      const pressureClass = rfqData.globalSpecs?.pressureClassDesignation || "PN16";
                      if (pipeEndConfig === "PE") return null;
                      const flangeCount =
                        pipeEndConfig === "FBE"
                          ? 2
                          : ["FOE", "FOE_LF", "FOE_RF", "2xLF", "2X_RF"].includes(pipeEndConfig)
                            ? pipeEndConfig === "2xLF" ||
                              pipeEndConfig === "2X_RF" ||
                              pipeEndConfig === "FOE_LF" ||
                              pipeEndConfig === "FOE_RF"
                              ? 2
                              : 1
                            : 1;
                      return (
                        <div className="text-blue-600 col-span-2">
                          Flanges/pipe: {flangeCount}x {nb}NB {pressureClass}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Bolt Sets & Gaskets Information */}
                {rfqData.requiredProducts?.includes("fasteners_gaskets") &&
                  (() => {
                    // Determine if item has flanges and get flange count
                    let hasFlanges = false;
                    let flangeCount = 0;
                    let nbMm = 0;
                    let branchNbMm = 0;
                    let branchFlangeCount = 0;

                    // Stub info for bends
                    const stubFlanges: Array<{ nb: number; count: number }> = [];

                    if (entry.itemType === "bend") {
                      const bendEndConfig = entry.specs?.bendEndConfiguration || "PE";
                      hasFlanges = bendEndConfig !== "PE";
                      // Use bolt set count function - 2 same-sized flanges = 1 bolt set
                      flangeCount = getBoltSetCountPerBend(bendEndConfig);
                      nbMm = entry.specs?.nominalBoreMm || 100;
                      // Get stub flanges - each stub of different size needs 1 bolt set
                      if (entry.specs?.stubs?.length > 0) {
                        entry.specs.stubs.forEach((stub: any) => {
                          if (stub?.nominalBoreMm) {
                            stubFlanges.push({ nb: stub.nominalBoreMm, count: 1 });
                          }
                        });
                      }
                    } else if (entry.itemType === "fitting") {
                      const fittingEndConfig = entry.specs?.pipeEndConfiguration || "PE";
                      hasFlanges = fittingEndConfig !== "PE";
                      nbMm = entry.specs?.nominalDiameterMm || 100;
                      branchNbMm = entry.specs?.branchNominalDiameterMm || nbMm;
                      // Use bolt set count function for fittings
                      const isEqualBranch = nbMm === branchNbMm;
                      const fittingBoltSets = getBoltSetCountPerFitting(
                        fittingEndConfig,
                        isEqualBranch,
                      );
                      flangeCount = fittingBoltSets.mainBoltSets;
                      branchFlangeCount = fittingBoltSets.branchBoltSets;
                    } else {
                      // Straight pipe - use bolt set count function
                      const pipeEndConfig = entry.specs?.pipeEndConfiguration || "PE";
                      hasFlanges = pipeEndConfig !== "PE";
                      flangeCount = getBoltSetCountPerPipe(pipeEndConfig);
                      nbMm = entry.specs?.nominalBoreMm || 100;
                    }

                    if (!hasFlanges && stubFlanges.length === 0) return null;

                    const pressureClass = rfqData.globalSpecs?.pressureClassDesignation || "PN16";
                    const bnwInfo = getBnwSetInfo(nbMm, pressureClass);
                    const branchBnwInfo =
                      branchFlangeCount > 0 ? getBnwSetInfo(branchNbMm, pressureClass) : null;
                    const gasketType = rfqData.globalSpecs?.gasketType;
                    const qty = entry.specs?.quantityValue || 1;
                    // Main bolt sets (not including stubs - stubs shown separately)
                    const mainBoltSets = flangeCount * qty;
                    const branchBoltSets = branchFlangeCount * qty;

                    return (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="text-orange-700">
                            <span className="font-medium">Bolt Sets:</span> {mainBoltSets}{" "}
                            {mainBoltSets === 1 ? "set" : "sets"} @ {bnwInfo.boltSize} ×{" "}
                            {bnwInfo.holesPerFlange} holes ({nbMm}NB)
                            {branchBoltSets > 0 && branchBnwInfo && (
                              <span className="ml-2">
                                + Branch: {branchBoltSets} × {branchBnwInfo.boltSize} ×{" "}
                                {branchBnwInfo.holesPerFlange} holes ({branchNbMm}NB)
                              </span>
                            )}
                            {stubFlanges.length > 0 &&
                              stubFlanges.map((stub, i) => {
                                const stubBnwInfo = getBnwSetInfo(stub.nb, pressureClass);
                                return (
                                  <span key={i} className="ml-2">
                                    + Stub {i + 1}: {stub.count * qty} × {stubBnwInfo.boltSize} ×{" "}
                                    {stubBnwInfo.holesPerFlange} holes ({stub.nb}NB)
                                  </span>
                                );
                              })}
                          </div>
                          {gasketType && (
                            <div className="text-green-700">
                              <span className="font-medium">Gaskets:</span> {mainBoltSets} ×{" "}
                              {gasketType} ({nbMm}NB)
                              {branchBoltSets > 0 && (
                                <span className="ml-2">
                                  + Branch: {branchBoltSets} × ({branchNbMm}NB)
                                </span>
                              )}
                              {stubFlanges.length > 0 &&
                                stubFlanges.map((stub, i) => (
                                  <span key={i} className="ml-2">
                                    + Stub {i + 1}: {stub.count * qty} × ({stub.nb}NB)
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            ))}
          </div>
        </div>

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
                const qty = entry.specs?.quantityValue || 1;
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
                  const bendEndConfig = entry.specs?.bendEndConfiguration || "PE";
                  const flangeConnections = getWeldCountPerBend(bendEndConfig);
                  if (nb && flangeConnections > 0) {
                    const od = NB_TO_OD_LOOKUP[nb] || nb * 1.05;
                    // Each flange connection has 2 welds (inside + outside), so x2
                    const weldsPerFlange = 2;
                    totalWeldLengthM +=
                      ((flangeConnections * weldsPerFlange * Math.PI * od) / 1000) * itemQty;
                    totalWeldCount += flangeConnections * weldsPerFlange * itemQty;
                  }
                } else if (entry.itemType === "fitting") {
                  const nb = entry.specs?.nominalDiameterMm;
                  const branchNb = entry.specs?.branchNominalDiameterMm || nb;
                  const fittingEndConfig = entry.specs?.pipeEndConfiguration || "PE";
                  const flangeConnections = getWeldCountPerFitting(fittingEndConfig);
                  if (nb && flangeConnections > 0) {
                    const mainOd = NB_TO_OD_LOOKUP[nb] || nb * 1.05;
                    const branchOd = NB_TO_OD_LOOKUP[branchNb] || branchNb * 1.05;
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
                  const pipeEndConfig = entry.specs?.pipeEndConfiguration || "PE";
                  const flangeConnections = getWeldCountPerPipe(pipeEndConfig);
                  if (nb && flangeConnections > 0) {
                    const od = NB_TO_OD_LOOKUP[nb] || nb * 1.05;
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
                const qty = entry.specs?.quantityValue || 1;
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
                  const bendEndConfig = entry.specs?.bendEndConfiguration || "PE";
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
                    flangesBySize[key] = (flangesBySize[key] || 0) + flangeCount * itemQty;
                  }
                } else if (entry.itemType === "fitting") {
                  const nb = entry.specs?.nominalDiameterMm;
                  const branchNb = entry.specs?.branchNominalDiameterMm || nb;
                  const fittingEndConfig = entry.specs?.pipeEndConfiguration || "PE";
                  if (fittingEndConfig !== "PE") {
                    const config = fittingEndConfig.split("");
                    let mainFlanges = 0,
                      branchFlanges = 0;
                    if (config[0] === "F") mainFlanges++;
                    if (config[1] === "F") mainFlanges++;
                    if (config[2] === "F") branchFlanges++;
                    if (mainFlanges > 0) {
                      const key = `${nb}NB`;
                      flangesBySize[key] = (flangesBySize[key] || 0) + mainFlanges * itemQty;
                    }
                    if (branchFlanges > 0) {
                      const key = `${branchNb}NB`;
                      flangesBySize[key] = (flangesBySize[key] || 0) + branchFlanges * itemQty;
                    }
                  }
                } else {
                  const nb = entry.specs?.nominalBoreMm;
                  const pipeEndConfig = entry.specs?.pipeEndConfiguration || "PE";
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
                    flangesBySize[key] = (flangesBySize[key] || 0) + flangeCount * itemQty;
                  }
                }
              });
              const totalFlanges = Object.values(flangesBySize).reduce(
                (sum, count) => sum + count,
                0,
              );
              if (totalFlanges === 0) return null;
              const pressureClass = rfqData.globalSpecs?.pressureClassDesignation || "PN16";
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

          {Object.keys(errors).length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-2">
                Please fix the following errors:
              </p>
              <ul className="text-sm text-red-600 space-y-1">
                {Object.entries(errors).map(([key, message]) => (
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
