import {
  pnClassForSdr,
  type SdrValue,
  sans1123StubAssemblyDescription,
} from "@annix/product-data/hdpe";
import { flangeConfigSuffix } from "./helpers";

// Build the consolidated row description for a pipe, branching on the
// entry's materialType. Avoids the previous bug where every BOQ row
// said "...Steel Pipe..." even for HDPE/PVC entries.
export const pipeRowDescription = (
  entry: any,
  nb: number,
  schedule: string,
  pipeLength: number,
  steelSpec: string,
  hdpeGrade: string | undefined,
  sdrNumber: number | undefined,
  pvcType: string | undefined,
  pressureClass: string | undefined,
  flangeSpec: string,
  globalHdpePressureRating: number | string | null | undefined,
  // "Perforated " / "Slotted " / "Solid " / "" — empty for standard
  // pipe. Always pre-pended so the supplier sees the variant first.
  variantPrefix: string = "",
): string => {
  const rawMatType = entry.materialType;
  const materialType = rawMatType || "steel";
  const rawPipeEnd = entry.specs?.pipeEndConfiguration;
  const flangeSuffix = flangeConfigSuffix(rawPipeEnd, materialType, flangeSpec);
  if (materialType === "hdpe") {
    const grade = hdpeGrade || "PE100";
    const sdrLabel = sdrNumber ? ` SDR${sdrNumber}` : "";
    const pnLabel = pressureClass ? ` ${pressureClass}` : "";
    // HDPE pipework terminates against valves / pumps / steel mains
    // via stub end + backing flange. We surface the SANS 1123 spec
    // unconditionally so the supplier knows what flange to drop in
    // — PN is taken from globalSpecs first, then derived from the
    // SDR via the PE100 SDR↔PN table, then from the parsed
    // pressureClass label as a last resort.
    const pnFromGlobal = globalHdpePressureRating ? Number(globalHdpePressureRating) : null;
    const pnFromSdrLookup =
      sdrNumber != null ? pnClassForSdr(sdrNumber as SdrValue, "PE100") : null;
    const pnFromLabel = pressureClass ? Number(String(pressureClass).replace(/[^\d.]/g, "")) : null;
    const pnNumberForStub =
      pnFromGlobal ||
      pnFromSdrLookup ||
      (pnFromLabel && Number.isFinite(pnFromLabel) ? pnFromLabel : null);
    const stubAssembly = pnNumberForStub ? sans1123StubAssemblyDescription(pnNumberForStub) : null;
    const stubSuffix = stubAssembly ? `, ${stubAssembly}` : "";
    return `${variantPrefix}${nb}OD ${grade}${sdrLabel}${pnLabel} HDPE Pipe x${pipeLength}m${flangeSuffix}${stubSuffix}`.trim();
  }
  if (materialType === "pvc") {
    const typeLabel = pvcType ? ` ${pvcType}` : "";
    const pnLabel = pressureClass ? ` ${pressureClass}` : "";
    // PVC flanges always: PVC stub-flange adapter + SANS 1123
    // backing ring drilled to the PVC class equivalent. Class N
    // bar = SANS 1123 Table N×100/3 (Class 16 → T1600/3). We
    // surface this when the pipe is flanged so the supplier
    // knows what backing ring to drop in.
    const pnNumberForStub = pressureClass
      ? Number(String(pressureClass).replace(/[^\d.]/g, ""))
      : null;
    const stubAssembly =
      pnNumberForStub && Number.isFinite(pnNumberForStub)
        ? sans1123StubAssemblyDescription(pnNumberForStub)
        : null;
    const isFlanged = !!flangeSuffix && flangeSuffix.length > 0;
    const stubSuffix = isFlanged && stubAssembly ? `, PVC stub + ${stubAssembly}` : "";
    return `${variantPrefix}${nb}OD${typeLabel} PVC Pipe${pnLabel} x${pipeLength}m${flangeSuffix}${stubSuffix}`.trim();
  }
  return `${variantPrefix}${nb}NB ${schedule ? `Sch${schedule.replace("Sch", "")}` : ""} ${steelSpec} Pipe x${pipeLength}m${flangeSuffix}`.trim();
};
