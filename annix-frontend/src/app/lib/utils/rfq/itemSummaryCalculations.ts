import { FITTING_CLASS_WALL_THICKNESS } from "@annix/product-data/pipe";
import {
  calculateInsideDiameter,
  calculateTotalSurfaceArea,
} from "@/app/lib/utils/pipeCalculations";
import { roundToWeldIncrement } from "@/app/lib/utils/weldThicknessLookup";

interface WeldThicknessResult {
  thickness: number | null;
  label: string;
}

interface SurfaceAreaResult {
  external: number | null;
  internal: number | null;
}

interface SteelSpec {
  id: number;
  steelSpecName: string;
}

interface PressureClassEntry {
  id: number;
  designation: string;
}

export function weldThicknessForEntry(
  entry: any,
  globalSpecs: any,
  masterData: { steelSpecs?: SteelSpec[] },
): WeldThicknessResult | null {
  if (entry.itemType === "fitting") {
    const rawWallThicknessMm = entry.specs?.wallThicknessMm;
    const fittingWt = rawWallThicknessMm || entry.calculation?.wallThicknessMm;
    if (fittingWt) {
      return { thickness: fittingWt, label: "Fitting WT" };
    }
    return null;
  }

  const dn = entry.specs?.nominalBoreMm;
  const rawScheduleNumber = entry.specs?.scheduleNumber;
  const schedule = rawScheduleNumber || "";
  const rawCalcWallThickness = entry.calculation?.wallThicknessMm;
  const pipeWallThickness = rawCalcWallThickness || entry.specs?.wallThicknessMm;
  if (!dn && !pipeWallThickness) return null;

  const rawSteelSpecificationId = entry.specs?.steelSpecificationId;
  const steelSpecId = rawSteelSpecificationId || globalSpecs?.steelSpecificationId;
  const steelSpec = masterData?.steelSpecs?.find((s: any) => s.id === steelSpecId);
  const rawSteelSpecName = steelSpec?.steelSpecName;
  const steelSpecName = rawSteelSpecName || "";
  const isSABS719 = steelSpecName.includes("SABS 719") || steelSpecName.includes("SANS 719");

  if (isSABS719) {
    const roundedWt = pipeWallThickness ? roundToWeldIncrement(pipeWallThickness) : null;
    return { thickness: roundedWt, label: "SABS 719 WT" };
  }

  const scheduleUpper = schedule.toUpperCase();
  const fittingClass =
    scheduleUpper.includes("160") || scheduleUpper.includes("XXS") || scheduleUpper.includes("XXH")
      ? "XXH"
      : scheduleUpper.includes("80") || scheduleUpper.includes("XS") || scheduleUpper.includes("XH")
        ? "XH"
        : "STD";

  const fittingWt = dn ? FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[dn] : null;
  const effectiveWt = fittingWt || pipeWallThickness;
  const label = fittingWt ? fittingClass : "Pipe WT";
  return { thickness: effectiveWt, label };
}

function bendSurfaceArea(entry: any): SurfaceAreaResult {
  const rawOutsideDiameterMm = entry.calculation?.outsideDiameterMm;
  const odMm = rawOutsideDiameterMm || entry.specs?.outsideDiameterMm;
  const rawWallThicknessMm = entry.calculation?.wallThicknessMm;
  const wtMm = rawWallThicknessMm || entry.specs?.wallThicknessMm;
  if (!odMm || !wtMm) return { external: null, internal: null };

  const idMm = odMm - 2 * wtMm;
  const odM = odMm / 1000;
  const idM = idMm / 1000;

  const rawBendRadiusMm = entry.specs?.bendRadiusMm;
  const rawNominalBoreMm = entry.specs?.nominalBoreMm;
  const rawCalcBendRadiusMm = entry.calculation?.bendRadiusMm;
  const rawCenterToFaceMm = entry.specs?.centerToFaceMm;
  const bendRadiusMm =
    rawBendRadiusMm ||
    rawCalcBendRadiusMm ||
    (rawCenterToFaceMm ? rawCenterToFaceMm : (rawNominalBoreMm || 100) * 1.5);
  const rawBendDegrees = entry.specs?.bendDegrees;
  const bendAngleDeg = rawBendDegrees || 90;
  const bendAngleRad = (bendAngleDeg * Math.PI) / 180;

  const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;

  let externalArea = odM * Math.PI * arcLengthM;
  let internalArea = idM * Math.PI * arcLengthM;

  const rawTangentLengths = entry.specs?.tangentLengths;
  const tangentLengths = rawTangentLengths || [];
  const rawItem0 = tangentLengths[0];
  const tangent1Mm = rawItem0 || 0;
  const rawItem1 = tangentLengths[1];
  const tangent2Mm = rawItem1 || 0;

  if (tangent1Mm > 0) {
    const t1LengthM = tangent1Mm / 1000;
    externalArea += odM * Math.PI * t1LengthM;
    internalArea += idM * Math.PI * t1LengthM;
  }
  if (tangent2Mm > 0) {
    const t2LengthM = tangent2Mm / 1000;
    externalArea += odM * Math.PI * t2LengthM;
    internalArea += idM * Math.PI * t2LengthM;
  }

  if (entry.specs?.stubs?.length > 0) {
    entry.specs.stubs.forEach((stub: any) => {
      if (stub?.nominalBoreMm && stub?.length) {
        const rawStubOd = stub.outsideDiameterMm;
        const stubOdMm = rawStubOd || stub.nominalBoreMm * 1.1;
        const rawStubWt = stub.wallThicknessMm;
        const stubWtMm = rawStubWt || stubOdMm * 0.08;
        const stubIdMm = stubOdMm - 2 * stubWtMm;
        const stubLengthM = stub.length / 1000;

        externalArea += (stubOdMm / 1000) * Math.PI * stubLengthM;
        internalArea += (stubIdMm / 1000) * Math.PI * stubLengthM;
      }
    });
  }

  return { external: externalArea, internal: internalArea };
}

function fittingSurfaceArea(entry: any, nbToOdMap: Record<number, number>): SurfaceAreaResult {
  const nb = entry.specs?.nominalDiameterMm;
  const rawBranchNb = entry.specs?.branchNominalDiameterMm;
  const branchNb = rawBranchNb || nb;
  const rawWt = entry.specs?.wallThicknessMm;
  const wt = rawWt || 10;
  const rawLengthA = entry.specs?.pipeLengthAMm;
  const lengthA = rawLengthA || 0;
  const rawLengthB = entry.specs?.pipeLengthBMm;
  const lengthB = rawLengthB || 0;

  if (!nb || (!lengthA && !lengthB)) return { external: null, internal: null };

  const rawMainOd = nbToOdMap[nb];
  const mainOd = rawMainOd || nb * 1.05;
  const rawBranchOd = nbToOdMap[branchNb];
  const branchOd = rawBranchOd || branchNb * 1.05;
  const mainId = mainOd - 2 * wt;
  const branchId = branchOd - 2 * wt;

  const runLengthM = (lengthA + lengthB) / 1000;
  const branchLengthM = (branchOd * 2) / 1000;

  const runExternalArea = (mainOd / 1000) * Math.PI * runLengthM;
  const branchExternalArea = (branchOd / 1000) * Math.PI * branchLengthM;
  const overlapExternal = (branchOd / 1000) * (wt / 1000) * Math.PI;
  const externalArea = runExternalArea + branchExternalArea - overlapExternal;

  const runInternalArea = (mainId / 1000) * Math.PI * runLengthM;
  const branchInternalArea = (branchId / 1000) * Math.PI * branchLengthM;
  const holeCutArea = Math.PI * (branchId / 1000 / 2) ** 2;
  const internalArea = runInternalArea + branchInternalArea - holeCutArea;

  return { external: externalArea, internal: internalArea };
}

function straightPipeSurfaceArea(
  entry: any,
  globalSpecs: any,
  masterData: { pressureClasses?: PressureClassEntry[] },
): SurfaceAreaResult {
  const rawOutsideDiameterMm = entry.calculation?.outsideDiameterMm;
  const rawWallThicknessMm = entry.specs?.wallThicknessMm;
  if (!rawOutsideDiameterMm || !rawWallThicknessMm) return { external: null, internal: null };

  const rawFlangePressureClassId = entry.specs?.flangePressureClassId;
  const rawGlobalFlangePcId = globalSpecs?.flangePressureClassId;
  const pcId = rawFlangePressureClassId || rawGlobalFlangePcId;
  const pcDesignation = pcId
    ? masterData.pressureClasses?.find((p: any) => p.id === pcId)?.designation
    : undefined;

  const rawIndividualPipeLength = entry.specs.individualPipeLength;
  const rawPipeEndConfiguration1 = entry.specs.pipeEndConfiguration;
  const rawPipeEndConfiguration2 = entry.specs.pipeEndConfiguration;

  const surfaceArea = calculateTotalSurfaceArea({
    outsideDiameterMm: entry.calculation.outsideDiameterMm,
    insideDiameterMm: calculateInsideDiameter(
      entry.calculation.outsideDiameterMm,
      entry.specs.wallThicknessMm,
    ),
    individualPipeLengthM: rawIndividualPipeLength || 0,
    numberOfPipes: 1,
    hasFlangeEnd1: (rawPipeEndConfiguration1 || "PE") !== "PE",
    hasFlangeEnd2: ["FBE", "FOE_RF", "2X_RF"].includes(rawPipeEndConfiguration2 || "PE"),
    dn: entry.specs.nominalBoreMm,
    pressureClass: pcDesignation,
  });

  return {
    external: surfaceArea.perPipe.totalExternalAreaM2,
    internal: surfaceArea.perPipe.totalInternalAreaM2,
  };
}

export function perUnitSurfaceAreas(
  entry: any,
  globalSpecs: any,
  masterData: { pressureClasses?: PressureClassEntry[] },
  nbToOdMap: Record<number, number>,
): SurfaceAreaResult {
  if (entry.itemType === "bend") return bendSurfaceArea(entry);
  if (entry.itemType === "fitting") return fittingSurfaceArea(entry, nbToOdMap);
  return straightPipeSurfaceArea(entry, globalSpecs, masterData);
}
