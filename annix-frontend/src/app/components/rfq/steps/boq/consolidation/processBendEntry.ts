import { sans1123StubAssemblyDescription } from "@annix/product-data/hdpe";
import { FLANGE_OD } from "@annix/product-data/pipe";
import { keys } from "es-toolkit/compat";
import { boltSetCountPerBend } from "@/app/lib/config/rfq/pipeEndOptions";
import {
  blankFlangeSurfaceArea,
  bnwSetInfo,
  flangeWeight,
  gasketWeightLookup,
} from "@/app/lib/query/hooks";
import { fallbackBendWeight, resolveHdpeDims, resolveHdpePn } from "../calc";
import {
  bendCenterToFaceMm,
  flangeConfigSuffix,
  getFlangeCountFromConfig,
  getFlangeTypeName,
  materialOfEntry,
} from "../helpers";
import type { ConsolidationContext } from "./context";

export function processBendEntry(
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
    const hdpeBendPn = hdpeBendSdr ? resolveHdpePn(hdpeBendSdr, globalHdpePressureRating) : null;
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
}
