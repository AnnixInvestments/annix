import { FLANGE_OD } from "@annix/product-data/pipe";
import { keys } from "es-toolkit/compat";
import { DEFAULT_PIPE_LENGTH_M, STEEL_DENSITY_KG_M3 } from "@/app/lib/config/rfq";
import { boltSetCountPerPipe } from "@/app/lib/config/rfq/pipeEndOptions";
import {
  blankFlangeSurfaceArea,
  bnwSetInfo,
  flangeWeight,
  gasketWeightLookup,
} from "@/app/lib/query/hooks";
import { fallbackPipeWeight, resolveHdpeDims, resolveSteelPipeDims } from "../calc";
import { pipeRowDescription } from "../description";
import {
  detectPipeVariant,
  getFlangeCountFromConfig,
  getFlangeTypeName,
  materialOfEntry,
  pipeVariantPrefix,
} from "../helpers";
import type { ConsolidationContext } from "./context";

export function processStraightPipeEntry(
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

      // One gasket per bolted joint (= per bolt set), not per flange
      if (existingGasket) {
        existingGasket.qty += pipeBoltSetQty;
        existingGasket.weight += gasketWeight * pipeBoltSetQty;
        existingGasket.entries.push(itemNumber);
        existingGasket.entryIds.push(entry.id);
      } else {
        consolidatedGaskets.set(gasketKey, {
          description: `${globalSpecs.gasketType} Gasket ${nb}NB ${flangeSpec}`,
          qty: pipeBoltSetQty,
          unit: "Each",
          weight: gasketWeight * pipeBoltSetQty,
          entries: [itemNumber],
          entryIds: [entry.id],
        });
      }
    }
  }

  // Puddle flange plate — spec-driven, not part of the end-config counts
  {
    const rawPuddleOdMm = entry.specs?.puddleFlangeOdMm;
    const rawPuddleThkMm = entry.specs?.puddleFlangeThicknessMm;
    const isPuddle = entry.specs?.pipeType === "puddle";
    if (isPuddle && rawPuddleOdMm > 0 && rawPuddleThkMm > 0) {
      const rawCalcOd = entry.calculation?.outsideDiameterMm;
      const pipeOdMm = rawCalcOd || nb * 1.05;
      const puddleWeightKg =
        Math.PI *
        ((rawPuddleOdMm / 2000) ** 2 - (pipeOdMm / 2000) ** 2) *
        (rawPuddleThkMm / 1000) *
        STEEL_DENSITY_KG_M3;
      const puddleKey = `PUDDLE_FLANGE_${rawPuddleOdMm}x${rawPuddleThkMm}_${nb}`;
      const existingPuddle = consolidatedFlanges.get(puddleKey);
      if (existingPuddle) {
        existingPuddle.qty += pipeQty;
        existingPuddle.weight += puddleWeightKg * pipeQty;
        existingPuddle.entries.push(itemNumber);
        existingPuddle.entryIds.push(entry.id);
      } else {
        consolidatedFlanges.set(puddleKey, {
          description: `Puddle Flange OD${rawPuddleOdMm}×${rawPuddleThkMm}mm (for ${nb}NB pipe)`,
          qty: pipeQty,
          unit: "Each",
          weight: puddleWeightKg * pipeQty,
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
