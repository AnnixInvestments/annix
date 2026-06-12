import { isString } from "es-toolkit/compat";
import type { ConsolidationContext } from "./consolidation/context";
import { processBendEntry } from "./consolidation/processBendEntry";
import { processFittingEntry } from "./consolidation/processFittingEntry";
import { processMiscEntry } from "./consolidation/processMiscEntry";
import { processStraightPipeEntry } from "./consolidation/processStraightPipeEntry";
import { processTankChuteEntry } from "./consolidation/processTankChuteEntry";
import { getFlangeSpec, getSteelSpecName } from "./spec";
import type { ConsolidatedItem } from "./types";

export function buildBoqConsolidation(deps: {
  entries: any[];
  globalSpecs: any;
  masterData: any;
  allWeights: any[];
  allBnwSets: any[];
  allGaskets: any[];
}) {
  const { entries, globalSpecs, masterData, allWeights, allBnwSets, allGaskets } = deps;

  const flangeSpecLookup = {
    globalFlangeStandardId: globalSpecs?.flangeStandardId,
    globalFlangePressureClassId: globalSpecs?.flangePressureClassId,
    globalFlangeTypeCode: globalSpecs?.flangeTypeCode,
    flangeStandards: masterData?.flangeStandards,
    pressureClasses: masterData?.pressureClasses,
  };
  const steelSpecLookup = {
    globalSteelSpecificationId: globalSpecs?.steelSpecificationId,
    steelSpecs: masterData?.steelSpecs,
  };
  const globalHdpeSdr = globalSpecs?.hdpeSdr;
  const globalHdpePressureRating = globalSpecs?.hdpePressureRating;

  // ======================
  // PIPE / WEIGHT HELPERS
  // ======================
  // Extracted to boq/calc.ts and boq/description.ts. Closure-bound
  // values (globalSpecs.hdpeSdr / hdpePressureRating) are now passed
  // explicitly so the helpers are unit-testable.

  // ======================
  // CONSOLIDATION LOGIC
  // ======================

  // Maps to store consolidated items. The legacy single-map
  // architecture is kept and partitioned by material at render time
  // so each consolidated row keeps its qty/weight accumulation logic
  // intact.
  const consolidatedPipes: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBends: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFittings: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFlanges: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBnwSets: Map<string, ConsolidatedItem> = new Map();
  const consolidatedGaskets: Map<string, ConsolidatedItem> = new Map();
  const consolidatedBlankFlanges: Map<string, ConsolidatedItem> = new Map();
  // Standalone groups not partitioned by material — valves get their
  // own table because a steel-bodied gate valve and an HDPE-stub-end
  // pinch valve are sourced from the same supplier category. Same
  // for fasteners (bolts/nuts/gaskets ship as a bundle regardless of
  // pipeline material). Unidentified holds anything where Nix could
  // not infer a productType.
  const consolidatedValves: Map<string, ConsolidatedItem> = new Map();
  const consolidatedTanks: Map<string, ConsolidatedItem> = new Map();
  const consolidatedFasteners: Map<string, ConsolidatedItem> = new Map();
  const consolidatedUnidentified: Map<string, ConsolidatedItem> = new Map();
  const consolidatedHdpeOther: Map<string, ConsolidatedItem> = new Map();
  const consolidatedSteelOther: Map<string, ConsolidatedItem> = new Map();
  const consolidatedPvcOther: Map<string, ConsolidatedItem> = new Map();
  // HDPE butt-fusion stub-end adapters — one per HDPE flange end.
  // Populated alongside the backing-flange consolidation so the
  // customer sees them as their own priceable line items, matching
  // what boqConsolidation.ts sends to the supplier (issue #288).
  const consolidatedHdpeStubs: Map<string, ConsolidatedItem> = new Map();

  const addHdpeStubItem = (
    nb: number,
    pressureClassLabel: string,
    sdrValue: number | string | undefined,
    flangeQty: number,
    itemNumberArg: string,
    entryId: string,
  ): void => {
    if (flangeQty <= 0) return;
    const sdrLabel = sdrValue ? `SDR${sdrValue}` : "";
    const sdrSuffix = sdrLabel ? ` ${sdrLabel}` : "";
    const pnSuffix = pressureClassLabel ? ` ${pressureClassLabel}` : "";
    const key = `HDPE_STUB_${nb}_${sdrLabel || "-"}_${pressureClassLabel || "-"}`;
    const existing = consolidatedHdpeStubs.get(key);
    if (existing) {
      existing.qty += flangeQty;
      existing.entries.push(itemNumberArg);
      existing.entryIds.push(entryId);
      return;
    }
    consolidatedHdpeStubs.set(key, {
      description: `${nb}OD HDPE PE100${sdrSuffix}${pnSuffix} Butt-Fusion Stub End`.trim(),
      qty: flangeQty,
      unit: "Each",
      weight: 0,
      entries: [itemNumberArg],
      entryIds: [entryId],
      material: "hdpe",
    });
  };

  // PVC stub-flange adapter (the PVC analog of the HDPE stub-end).
  // One per PVC-pipe flange end. Less common than HDPE — most PVC
  // flanging is slip-on + backing ring directly — but consolidated
  // separately so suppliers price the adapter as its own item.
  const consolidatedPvcStubs: Map<string, ConsolidatedItem> = new Map();

  const addPvcStubItem = (
    nb: number,
    pressureClassLabel: string,
    pvcGradeLabel: string | undefined,
    flangeQty: number,
    itemNumberArg: string,
    entryId: string,
  ): void => {
    if (flangeQty <= 0) return;
    const gradeLabel = pvcGradeLabel || "uPVC";
    const pnSuffix = pressureClassLabel ? ` ${pressureClassLabel}` : "";
    const key = `PVC_STUB_${nb}_${gradeLabel}_${pressureClassLabel || "-"}`;
    const existing = consolidatedPvcStubs.get(key);
    if (existing) {
      existing.qty += flangeQty;
      existing.entries.push(itemNumberArg);
      existing.entryIds.push(entryId);
      return;
    }
    consolidatedPvcStubs.set(key, {
      description: `${nb}OD ${gradeLabel}${pnSuffix} Stub Flange Adapter`.trim(),
      qty: flangeQty,
      unit: "Each",
      weight: 0,
      entries: [itemNumberArg],
      entryIds: [entryId],
      material: "pvc",
    });
  };

  // Defense-in-depth reclassifier for legacy drafts that came through
  // Nix BEFORE the consumable-regex fix landed. Those drafts have
  // steel pipe rows tagged itemType="misc" because their coating spec
  // mentioned "Carboline" (a brand name) and the old regex matched it.
  // Here we sniff the description for structural keywords and rebuild
  // a properly-typed entry in memory so the structured branches below
  // process it — putting it in the right Steel Pipes / Bends /
  // Fittings BOQ section instead of "Steel Other". No DB mutation.
  const reclassifyMiscPipeRow = (orig: any): any => {
    if (orig.itemType !== "misc") return orig;
    const rawOrigSpecs = orig.specs;
    const specs = rawOrigSpecs || {};
    if (specs.productType !== "steel") return orig;
    const rawOrigDescription = orig.description;
    const description = rawOrigDescription || "";
    if (!description) return orig;

    // Parse DN out of "DN N" or "DN N mild steel" etc. Same regex
    // shape as the misc-bucket DN parser further down.
    const dnPrefixMatch = description.match(/(?:DN|OD)\s*(\d{2,4})/i);
    const dnDiameterMatch = description.match(/(\d{2,4})\s*mm\s*(?:diameter|dia\.?|Ø)/i);
    const dn = dnPrefixMatch
      ? Number(dnPrefixMatch[1])
      : dnDiameterMatch
        ? Number(dnDiameterMatch[1])
        : null;
    if (!dn || !Number.isFinite(dn)) return orig;

    const wtMatch = description.match(/(\d+(?:\.\d+)?)\s*mm\s*wall\s*thickness/i);
    const wallThicknessMm = wtMatch ? Number(wtMatch[1]) : undefined;

    const lower = description.toLowerCase();
    const isLateral = /\b\d+\s*deg(?:ree)?s?\s*lateral\b|\blaterals?\b/.test(lower);
    const isBlankFlange = /\bblank\s*flange\b/.test(lower);
    const isReducer = /\breducers?\b/.test(lower);
    const isTee = /\b(t[-\s]?piece|tees?|sweep\s*t)\b/.test(lower);
    const isBend = /\b(\d+\s*deg(?:ree)?s?\s*bend|long\s*radius|sweep\s*bend|elbow)\b/.test(lower);
    const isSpool = /\bspools?\b/.test(lower);
    const isStraightPipe =
      /\bstraight\s*pipes?\b|\bpipe\s*spools?\b|\bstraight\s*spools?\b/.test(lower) ||
      (/\bmild\s*steel\s*pipes?\b/.test(lower) &&
        !isBend &&
        !isTee &&
        !isReducer &&
        !isLateral &&
        !isBlankFlange);

    // Hoist spec field accesses to plain locals before the OR
    // fallbacks — keeps the SWC-safety rule happy in dev builds.
    const rawScheduleNumber = specs.scheduleNumber;
    const rawScheduleType = specs.scheduleType;
    const rawQuantityType = specs.quantityType;
    const rawQuantityValue = specs.quantityValue;
    const rawIndividualPipeLength = specs.individualPipeLength;
    const rawUnit = specs.unit;

    const baseSpecsForFitting = {
      ...specs,
      nominalDiameterMm: dn,
      wallThicknessMm,
      scheduleNumber: rawScheduleNumber || "",
      quantityType: rawQuantityType || "number_of_items",
      quantityValue: rawQuantityValue || 1,
      fittingStandard: "SABS719",
    };

    if (isLateral) {
      return {
        ...orig,
        itemType: "fitting",
        materialType: "steel",
        specs: { ...baseSpecsForFitting, fittingType: "SABS719_LATERAL" },
      };
    }
    if (isReducer) {
      return {
        ...orig,
        itemType: "fitting",
        materialType: "steel",
        specs: { ...baseSpecsForFitting, fittingType: "CON_REDUCER" },
      };
    }
    if (isTee) {
      return {
        ...orig,
        itemType: "fitting",
        materialType: "steel",
        specs: { ...baseSpecsForFitting, fittingType: "SWEEP_TEE" },
      };
    }
    if (isBlankFlange) {
      return {
        ...orig,
        itemType: "fitting",
        materialType: "steel",
        specs: { ...baseSpecsForFitting, fittingType: "EQUAL_TEE" },
      };
    }
    if (isBend) {
      const angleMatch = description.match(/(\d+(?:\.\d+)?)\s*deg(?:ree)?s?/i);
      const bendDegrees = angleMatch ? Number(angleMatch[1]) : 90;
      const radiusMatch = description.match(/(\d+(?:\.\d+)?)\s*[xX]\s*D\b/);
      const bendType = radiusMatch ? `${radiusMatch[1]}D` : "3D";
      return {
        ...orig,
        itemType: "bend",
        materialType: "steel",
        specs: {
          ...specs,
          nominalBoreMm: dn,
          wallThicknessMm,
          bendDegrees,
          bendType,
          scheduleNumber: rawScheduleNumber || "",
          quantityType: rawQuantityType || "number_of_items",
          quantityValue: rawQuantityValue || 1,
        },
      };
    }
    if (isStraightPipe || isSpool) {
      const unitLower = isString(rawUnit) ? rawUnit.toLowerCase() : "";
      const unitIsMetres = /^(m|lm|metres?|meters?)$/.test(unitLower);
      const explicitLengthM = description.match(
        /(\d+(?:\.\d+)?)\s*m(?:etres?)?\s+(?:pipe\s*)?(?:length|long)\b/i,
      );
      const explicitLengthMm = description.match(/(\d+(?:\.\d+)?)\s*mm\s+long\b/i);
      let pipeLengthM = rawIndividualPipeLength || 12;
      if (explicitLengthM) pipeLengthM = Number(explicitLengthM[1]);
      else if (explicitLengthMm) pipeLengthM = Number(explicitLengthMm[1]) / 1000;
      return {
        ...orig,
        itemType: "straight_pipe",
        materialType: "steel",
        specs: {
          ...specs,
          nominalBoreMm: dn,
          wallThicknessMm,
          scheduleType: rawScheduleType || "wall_thickness",
          scheduleNumber: rawScheduleNumber || "",
          individualPipeLength: pipeLengthM,
          lengthUnit: "meters",
          quantityType: unitIsMetres ? "total_length" : "number_of_pipes",
          quantityValue: rawQuantityValue || 1,
        },
      };
    }
    return orig;
  };

  // Process each entry
  const ctx: ConsolidationContext = {
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
  };
  entries.forEach((rawEntry) => {
    const entry = reclassifyMiscPipeRow(rawEntry);
    const rawClientItemNumber = entry.clientItemNumber;
    const itemNumber = rawClientItemNumber || entry.id;
    const rawQuantityValue = entry.specs?.quantityValue;
    const rawCalculatedPipeCountForQty = entry.calculation?.calculatedPipeCount;
    const qty = rawQuantityValue || rawCalculatedPipeCountForQty || 1;
    const steelSpec = getSteelSpecName(entry, steelSpecLookup);
    const flangeSpec = getFlangeSpec(entry, flangeSpecLookup);

    if (entry.itemType === "bend") {
      processBendEntry(entry, itemNumber, qty, steelSpec, flangeSpec, ctx);
    } else if (entry.itemType === "fitting") {
      processFittingEntry(entry, itemNumber, qty, steelSpec, flangeSpec, ctx);
    } else if (entry.itemType === "misc") {
      processMiscEntry(entry, itemNumber, qty, steelSpec, flangeSpec, ctx);
    } else if (entry.itemType === "tank_chute") {
      processTankChuteEntry(entry, itemNumber, qty, steelSpec, flangeSpec, ctx);
    } else {
      processStraightPipeEntry(entry, itemNumber, qty, steelSpec, flangeSpec, ctx);
    }
  });

  // Calculate totals
  let totalWeight = 0;
  consolidatedPipes.forEach((item) => (totalWeight += item.weight));
  consolidatedBends.forEach((item) => (totalWeight += item.weight));
  consolidatedFittings.forEach((item) => (totalWeight += item.weight));
  consolidatedFlanges.forEach((item) => (totalWeight += item.weight));
  consolidatedBnwSets.forEach((item) => (totalWeight += item.weight));
  consolidatedGaskets.forEach((item) => (totalWeight += item.weight));
  consolidatedBlankFlanges.forEach((item) => (totalWeight += item.weight));
  return {
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
    totalWeight,
  };
}
