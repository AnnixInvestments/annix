"use client";

import { memo } from "react";
import {
  boltSetCountPerBend as getBoltSetCountPerBend,
  boltSetCountPerFitting as getBoltSetCountPerFitting,
  boltSetCountPerPipe as getBoltSetCountPerPipe,
  fittingBranchNbMm as getFittingBranchNbMm,
  weldCountPerBend as getWeldCountPerBend,
  weldCountPerFitting as getWeldCountPerFitting,
  weldCountPerPipe as getWeldCountPerPipe,
} from "@/app/lib/config/rfq";
import { bnwSetInfo } from "@/app/lib/query/hooks";

interface ReviewItemsSummaryProps {
  allItems: any[];
  rfqData: any;
  nbToOdMap: Record<number, number>;
  allBnwSets: any[];
}

const ReviewItemsSummaryInner = (props: ReviewItemsSummaryProps) => {
  const { allItems, rfqData, nbToOdMap, allBnwSets } = props;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Item Requirements</h3>
      <div className="space-y-4">
        {allItems.map((entry: any, index: number) => {
          const rawQuantityValue4 = entry.specs.quantityValue;
          const rawFittingType = entry.specs.fittingType;
          const rawFittingStandard = entry.specs.fittingStandard;
          const rawQuantityValue6 = entry.specs.quantityValue;
          const rawTotalWeight3 = entry.calculation?.totalWeight;
          const rawQuantityValue7 = entry.specs?.quantityValue;
          const rawScheduleNumber = entry.specs.scheduleNumber;

          return (
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
                  <div>Qty: {rawQuantityValue4 || 1}</div>
                  {entry.specs.numberOfTangents > 0 && (
                    <div className="col-span-2">Tangents: {entry.specs.numberOfTangents}</div>
                  )}
                  {entry.specs.numberOfStubs > 0 && (
                    <div className="col-span-2">Stubs: {entry.specs.numberOfStubs}</div>
                  )}
                  <div>
                    Weight/item: {(() => {
                      const rawTotalWeight2 = entry.calculation?.totalWeight;
                      const totalWt = rawTotalWeight2 || 0;
                      const rawQuantityValue5 = entry.specs?.quantityValue;
                      const qty = rawQuantityValue5 || 1;
                      return (totalWt / qty).toFixed(2);
                    })()} kg
                  </div>
                  {/* Surface areas for bend - PER ITEM */}
                  {(() => {
                    const nb = entry.specs?.nominalBoreMm;
                    const rawWallThicknessMm3 = entry.specs?.wallThicknessMm;
                    const wt = rawWallThicknessMm3 || entry.calculation?.wallThicknessMm;
                    if (!nb || !wt) return null;
                    const rawNb2 = nbToOdMap[nb];
                    const od = rawNb2 || nb * 1.05;
                    const id = od - 2 * wt;
                    const rawBendType3 = entry.specs?.bendType;
                    const bendRadiusType = rawBendType3 || "1.5D";
                    const radiusFactor = parseFloat(bendRadiusType.replace("D", "")) || 1.5;
                    const bendRadiusMm = nb * radiusFactor;
                    const rawBendDegrees3 = entry.specs?.bendDegrees;
                    const bendAngleRad = ((rawBendDegrees3 || 90) * Math.PI) / 180;
                    const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;
                    let extArea = (od / 1000) * Math.PI * arcLengthM;
                    let intArea = (id / 1000) * Math.PI * arcLengthM;
                    const rawTangentLengths3 = entry.specs?.tangentLengths;
                    const tangents = rawTangentLengths3 || [];
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
                    const rawWallThicknessMm4 = entry.specs?.wallThicknessMm;
                    const wt = rawWallThicknessMm4 || entry.calculation?.wallThicknessMm;
                    const rawBendEndConfiguration = entry.specs?.bendEndConfiguration;
                    const bendEndConfig = rawBendEndConfiguration || "PE";
                    const flangeConnections = getWeldCountPerBend(bendEndConfig);
                    if (!nb || !wt || flangeConnections === 0) return null;
                    const rawNb3 = nbToOdMap[nb];
                    const od = rawNb3 || nb * 1.05;
                    const circumferenceMm = Math.PI * od;
                    // x2 because each flanged connection requires 2 welds (inside + outside)
                    const weldsPerConnection = 2;
                    const totalWelds = flangeConnections * weldsPerConnection;
                    const linearWeldMm = totalWelds * circumferenceMm;
                    return (
                      <div className="text-purple-700 col-span-2 font-medium">
                        Welds/item: {totalWelds} ({flangeConnections} flange × 2) @{" "}
                        {circumferenceMm.toFixed(0)}mm circ = {(linearWeldMm / 1000).toFixed(2)}m (
                        {wt.toFixed(1)}mm WT)
                      </div>
                    );
                  })()}
                  {/* Flange breakdown for bend */}
                  {(() => {
                    const nb = entry.specs?.nominalBoreMm;
                    const rawBendEndConfiguration2 = entry.specs?.bendEndConfiguration;
                    const bendEndConfig = rawBendEndConfiguration2 || "PE";
                    const rawPressureClassDesignation =
                      rfqData.globalSpecs?.pressureClassDesignation;
                    const pressureClass = rawPressureClassDesignation || "PN16";
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
                  <div>Type: {rawFittingType || "N/A"}</div>
                  <div>Standard: {rawFittingStandard || "N/A"}</div>
                  <div>
                    NB: {entry.specs.nominalDiameterMm}mm
                    {(() => {
                      const branchNb = getFittingBranchNbMm(entry.specs);
                      return branchNb && branchNb !== entry.specs.nominalDiameterMm
                        ? ` x ${branchNb}mm`
                        : "";
                    })()}
                  </div>
                  <div>Qty: {rawQuantityValue6 || 1}</div>
                  {entry.specs.pipeLengthAMm && <div>Length A: {entry.specs.pipeLengthAMm}mm</div>}
                  {entry.specs.pipeLengthBMm && <div>Length B: {entry.specs.pipeLengthBMm}mm</div>}
                  <div>
                    Weight/item:{" "}
                    {entry.calculation?.weightPerItem?.toFixed(2) ||
                      ((rawTotalWeight3 || 0) / (rawQuantityValue7 || 1)).toFixed(2) ||
                      "-"}{" "}
                    kg
                  </div>
                  {/* Surface areas for fitting - PER ITEM */}
                  {(() => {
                    const nb = entry.specs?.nominalDiameterMm;
                    const branchNb = getFittingBranchNbMm(entry.specs) || nb;
                    const rawWallThicknessMm5 = entry.specs?.wallThicknessMm;
                    const wt = rawWallThicknessMm5 || 10;
                    const rawPipeLengthAMm3 = entry.specs?.pipeLengthAMm;
                    const lengthA = rawPipeLengthAMm3 || 0;
                    const rawPipeLengthBMm3 = entry.specs?.pipeLengthBMm;
                    const lengthB = rawPipeLengthBMm3 || 0;
                    if (!nb || (!lengthA && !lengthB)) return null;
                    const rawNb4 = nbToOdMap[nb];
                    const mainOd = rawNb4 || nb * 1.05;
                    const rawBranchNb2 = nbToOdMap[branchNb];
                    const branchOd = rawBranchNb2 || branchNb * 1.05;
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
                    const branchNb = getFittingBranchNbMm(entry.specs) || nb;
                    const rawWallThicknessMm6 = entry.specs?.wallThicknessMm;
                    const wt = rawWallThicknessMm6 || 10;
                    const rawPipeEndConfiguration2 = entry.specs?.pipeEndConfiguration;
                    const fittingEndConfig = rawPipeEndConfiguration2 || "PE";
                    const weldCount = getWeldCountPerFitting(fittingEndConfig);
                    if (!nb || weldCount === 0) return null;
                    const rawNb5 = nbToOdMap[nb];
                    const mainOd = rawNb5 || nb * 1.05;
                    const rawBranchNb3 = nbToOdMap[branchNb];
                    const branchOd = rawBranchNb3 || branchNb * 1.05;
                    // For tees: 2 welds on main run + 1 weld on branch
                    // Total linear = 2 × main circ + 1 × branch circ
                    const mainCirc = Math.PI * mainOd;
                    const branchCirc = Math.PI * branchOd;
                    // Estimate: for FFF (3 flanges) = 3 welds, distribute proportionally
                    let linearWeldMm = 0;
                    if (weldCount >= 3) {
                      // 2 main + 1 branch
                      linearWeldMm = 2 * mainCirc + branchCirc;
                    } else if (weldCount === 2) {
                      // 2 main welds
                      linearWeldMm = 2 * mainCirc;
                    } else {
                      // 1 main weld
                      linearWeldMm = mainCirc;
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
                    const branchNb = getFittingBranchNbMm(entry.specs) || nb;
                    const rawPipeEndConfiguration3 = entry.specs?.pipeEndConfiguration;
                    const fittingEndConfig = rawPipeEndConfiguration3 || "PE";
                    const rawPressureClassDesignation2 =
                      rfqData.globalSpecs?.pressureClassDesignation;
                    const pressureClass = rawPressureClassDesignation2 || "PN16";
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
                  <div>Schedule: {rawScheduleNumber || `${entry.specs.wallThicknessMm}mm WT`}</div>
                  <div>
                    Length/pipe: {(() => {
                      // Show per-pipe length
                      if (entry.specs.quantityType === "total_length") {
                        const rawQuantityValue8 = entry.specs.quantityValue;
                        return Number(rawQuantityValue8 || 0).toFixed(3);
                      } else {
                        const rawIndividualPipeLength3 = entry.specs.individualPipeLength;
                        return (rawIndividualPipeLength3 || 0).toFixed(3);
                      }
                    })()}m
                  </div>
                  <div>
                    Qty: {(() => {
                      if (entry.specs.quantityType === "total_length") return "1";
                      const rawQuantityValue9 = entry.specs.quantityValue;
                      return rawQuantityValue9 || 1;
                    })()}
                  </div>
                  <div>
                    Weight/pipe: {(() => {
                      const rawTotalSystemWeight2 = entry.calculation?.totalSystemWeight;
                      const totalWt = rawTotalSystemWeight2 || 0;
                      if (entry.specs.quantityType === "total_length") return totalWt.toFixed(2);
                      const rawQuantityValue10 = entry.specs.quantityValue;
                      const qty = rawQuantityValue10 || 1;
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
                      const rawQuantityValue11 = entry.specs.quantityValue;
                      perPipeLengthM = rawQuantityValue11 || 0;
                    } else {
                      const rawIndividualPipeLength4 = entry.specs.individualPipeLength;
                      perPipeLengthM = rawIndividualPipeLength4 || 0;
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
                    const rawPipeEndConfiguration4 = entry.specs?.pipeEndConfiguration;
                    const pipeEndConfig = rawPipeEndConfiguration4 || "PE";
                    // Number of flanged connections
                    const flangeConnections = getWeldCountPerPipe(pipeEndConfig);
                    if (!nb || !wt || flangeConnections === 0) return null;
                    const rawNb6 = nbToOdMap[nb];
                    const od = rawNb6 || nb * 1.05;
                    const circumferenceMm = Math.PI * od;
                    // x2 because each flanged connection requires 2 welds (inside + outside)
                    const weldsPerConnection = 2;
                    const totalWelds = flangeConnections * weldsPerConnection;
                    const linearWeldMm = totalWelds * circumferenceMm;
                    return (
                      <div className="text-purple-700 col-span-2 font-medium">
                        Welds/pipe: {totalWelds} ({flangeConnections} flange × 2) @{" "}
                        {circumferenceMm.toFixed(0)}mm circ = {(linearWeldMm / 1000).toFixed(2)}m (
                        {wt.toFixed(1)}mm WT)
                      </div>
                    );
                  })()}
                  {/* Flange breakdown for pipe */}
                  {(() => {
                    const nb = entry.specs?.nominalBoreMm;
                    const rawPipeEndConfiguration5 = entry.specs?.pipeEndConfiguration;
                    const pipeEndConfig = rawPipeEndConfiguration5 || "PE";
                    const rawPressureClassDesignation3 =
                      rfqData.globalSpecs?.pressureClassDesignation;
                    const pressureClass = rawPressureClassDesignation3 || "PN16";
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
                    const rawBendEndConfiguration3 = entry.specs?.bendEndConfiguration;
                    const bendEndConfig = rawBendEndConfiguration3 || "PE";
                    hasFlanges = bendEndConfig !== "PE";
                    // Use bolt set count function - 2 same-sized flanges = 1 bolt set.
                    // Sweep tees have a third same-NB opening: openings-1 = 2 sets.
                    flangeCount = getBoltSetCountPerBend(bendEndConfig);
                    if (entry.specs?.bendItemType === "SWEEP_TEE" && flangeCount > 0) {
                      flangeCount += 1;
                    }
                    const rawNominalBoreMm2 = entry.specs?.nominalBoreMm;
                    nbMm = rawNominalBoreMm2 || 100;
                    // Get stub flanges - each stub of different size needs 1 bolt set
                    if (entry.specs?.stubs?.length > 0) {
                      entry.specs.stubs.forEach((stub: any) => {
                        if (stub?.nominalBoreMm) {
                          stubFlanges.push({ nb: stub.nominalBoreMm, count: 1 });
                        }
                      });
                    }
                  } else if (entry.itemType === "fitting") {
                    const rawPipeEndConfiguration6 = entry.specs?.pipeEndConfiguration;
                    const fittingEndConfig = rawPipeEndConfiguration6 || "PE";
                    hasFlanges = fittingEndConfig !== "PE";
                    const rawNominalDiameterMm = entry.specs?.nominalDiameterMm;
                    nbMm = rawNominalDiameterMm || 100;
                    branchNbMm = getFittingBranchNbMm(entry.specs) || nbMm;
                    // Use bolt set count function for fittings
                    const isEqualBranch = nbMm === branchNbMm;
                    const fittingBoltSets = getBoltSetCountPerFitting(
                      fittingEndConfig,
                      isEqualBranch,
                    );
                    flangeCount = fittingBoltSets.mainBoltSets;
                    branchFlangeCount = fittingBoltSets.branchBoltSets;
                  } else {
                    const rawPipeEndConfiguration7 = entry.specs?.pipeEndConfiguration;
                    // Straight pipe - use bolt set count function
                    const pipeEndConfig = rawPipeEndConfiguration7 || "PE";
                    hasFlanges = pipeEndConfig !== "PE";
                    flangeCount = getBoltSetCountPerPipe(pipeEndConfig);
                    const rawNominalBoreMm3 = entry.specs?.nominalBoreMm;
                    nbMm = rawNominalBoreMm3 || 100;
                  }

                  if (!hasFlanges && stubFlanges.length === 0) return null;

                  const rawPressureClassDesignation4 =
                    rfqData.globalSpecs?.pressureClassDesignation;

                  const pressureClass = rawPressureClassDesignation4 || "PN16";
                  const bnwInfo = bnwSetInfo(allBnwSets, nbMm, pressureClass);
                  const branchBnwInfo =
                    branchFlangeCount > 0
                      ? bnwSetInfo(allBnwSets, branchNbMm, pressureClass)
                      : null;
                  const gasketType = rfqData.globalSpecs?.gasketType;
                  const rawQuantityValue12 = entry.specs?.quantityValue;
                  const qty = rawQuantityValue12 || 1;
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
                              const stubBnwInfo = bnwSetInfo(allBnwSets, stub.nb, pressureClass);
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
          );
        })}
      </div>
    </div>
  );
};

export const ReviewItemsSummary = memo(ReviewItemsSummaryInner);
