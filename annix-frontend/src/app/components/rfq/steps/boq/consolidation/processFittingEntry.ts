import {
  hdpeReducerLength,
  hdpeTeeDimensions,
  inferReducerBranchDn,
  sans1123StubAssemblyDescription,
} from "@annix/product-data/hdpe";
import { FLANGE_OD } from "@annix/product-data/pipe";
import { keys } from "es-toolkit/compat";
import { boltSetCountPerFitting } from "@/app/lib/config/rfq/pipeEndOptions";
import {
  blankFlangeSurfaceArea,
  bnwSetInfo,
  flangeWeight,
  gasketWeightLookup,
} from "@/app/lib/query/hooks";
import { fallbackFittingWeight, resolveHdpeDims, resolveHdpePn } from "../calc";
import {
  flangeConfigSuffix,
  getFlangeCountFromConfig,
  getFlangeTypeName,
  materialOfEntry,
} from "../helpers";
import type { ConsolidationContext } from "./context";

export function processFittingEntry(
  entry: any,
  itemNumber: string,
  qty: number,
  steelSpec: string,
  flangeSpec: string,
  ctx: ConsolidationContext,
) {
  const {
    consolidatedPipes,
    consolidatedBends,
    consolidatedFittings,
    consolidatedFlanges,
    consolidatedBnwSets,
    consolidatedGaskets,
    consolidatedBlankFlanges,
    consolidatedValves,
    consolidatedTanks,
    consolidatedFasteners,
    consolidatedUnidentified,
    consolidatedHdpeOther,
    consolidatedSteelOther,
    consolidatedPvcOther,
    consolidatedHdpeStubs,
    consolidatedPvcStubs,
    steelSpecLookup,
    flangeSpecLookup,
    globalHdpeSdr,
    globalHdpePressureRating,
    allWeights,
    allBnwSets,
    allGaskets,
    globalSpecs,
    masterData,
    addHdpeStubItem,
    addPvcStubItem,
  } = ctx;
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
  const isShortTee = ["SHORT_TEE", "UNEQUAL_SHORT_TEE", "SHORT_REDUCING_TEE"].includes(fittingType);
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
      fittingMaterialType === "hdpe" ? "HDPE" : fittingMaterialType === "pvc" ? "PVC" : steelSpec;
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
      isHdpeFitting && isReducerType && !reducerHasExplicitBranch ? inferReducerBranchDn(nb) : null;
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
    const branchBnwInfo = bnwSetInfo(allBnwSets, branchNb, flangeSpec.split(" ").pop() || "PN16");
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
      const branchGasketWeight = gasketWeightLookup(allGaskets, globalSpecs.gasketType, branchNb);

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
}
