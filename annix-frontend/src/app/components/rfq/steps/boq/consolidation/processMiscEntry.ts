import { hdpeEndCapLength, lateralDimensions } from "@annix/product-data/hdpe";
import { fallbackMiscWeight } from "../calc";
import type { ConsolidatedItem, MaterialKey } from "../types";
import type { ConsolidationContext } from "./context";

export function processMiscEntry(
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
  // Misc items are split into one of: valves (any description
  // matching valve patterns goes there regardless of material),
  // fasteners (bolts/nuts/gaskets/washers), or material-specific
  // "other" buckets (HDPE end caps, laterals, puddle pipes; PVC
  // fittings; steel offcuts). Items with no productType land in
  // unidentified at the very bottom of the BOQ.
  const rawEntrySpecs = entry.specs;
  const rawSpecs = rawEntrySpecs || {};
  const rawEntryDescription = entry.description;
  const miscDescription = rawEntryDescription || "Item";
  const rawSpecsQuantityValueMisc = rawSpecs.quantityValue;
  const miscQty = rawSpecsQuantityValueMisc || qty || 1;
  const rawSpecsUnit = rawSpecs.unit;
  const miscUnit = rawSpecsUnit || "Each";
  const rawSpecsProductType = rawSpecs.productType;
  const rawSpecsNixItemType = rawSpecs.nixItemType;
  const descLower = miscDescription.toLowerCase();
  const isValveDescription =
    rawSpecsNixItemType === "valve" ||
    /\b(valve|RSV|pinch\s*valve|gate\s*valve|globe\s*valve|ball\s*valve|butterfly\s*valve|check\s*valve|knife\s*valve|hand\s*pump|hydraulic\s*pump)\b/i.test(
      miscDescription,
    );
  // Override `nixItemType === "consumable"` when the description
  // clearly identifies a steel pipe / bend / tee / flange / spool
  // / lateral. The excel-extractor over-matches "consumable" on
  // rows where words like "Carboline" or "epoxy coated" appear in
  // the COATING SPEC of an otherwise-procurement pipe row. Trust
  // the description content over the upstream classification.
  const looksLikePipingDescription =
    /\bDN\s*\d+\s+[^.]*?(pipes?|bends?|tees?|t[-\s]?pieces?|laterals?|reducers?|blank\s*flanges?|spools?|spigot|stub[-\s]?ons?|sweep)\b/i.test(
      miscDescription,
    ) ||
    /\brubber[-\s]?lined\s+(?:mild\s*)?steel\b/i.test(miscDescription) ||
    /\bmild\s*steel\s*pipes?\b/i.test(miscDescription);
  const isFastenerDescription =
    /\b(bolts?|nuts?|washers?|studs?|gaskets?|fasteners?|jointing\s*rings?)\b/i.test(
      miscDescription,
    ) ||
    (rawSpecsNixItemType === "consumable" && !looksLikePipingDescription);

  const miscKey = `MISC_${descLower}_${miscUnit}`;
  // Pick destination map. Valves first (covers cross-material),
  // then fasteners, then per-material "other", then unidentified.
  let dest: Map<string, ConsolidatedItem>;
  let mat: MaterialKey | undefined;
  if (isValveDescription) {
    dest = consolidatedValves;
  } else if (isFastenerDescription) {
    dest = consolidatedFasteners;
  } else if (rawSpecsProductType === "hdpe") {
    dest = consolidatedHdpeOther;
    mat = "hdpe";
  } else if (rawSpecsProductType === "pvc" || rawSpecsProductType === "upvc") {
    dest = consolidatedPvcOther;
    mat = "pvc";
  } else if (rawSpecsProductType === "steel") {
    dest = consolidatedSteelOther;
    mat = "steel";
  } else {
    dest = consolidatedUnidentified;
  }

  // HDPE misc-item description enrichment: end caps and laterals
  // are NOT classified as fittings by Nix (they land in
  // consolidatedHdpeOther via the misc bucket), but we still
  // know their catalogue geometry from packages/product-data/hdpe.
  // Append the canonical dim to the description here so the
  // supplier sees consistent take-off data across every HDPE row,
  // not just the ones that round-tripped through the manual form.
  //
  // DN is parsed in priority order:
  //   1. entry.specs.nominalBoreMm  (set when Nix recognised the size)
  //   2. /(?:DN|OD)\s*(\d{2,4})/    (fallback regex on description)
  const enrichedMiscDescription = ((): string => {
    if (rawSpecsProductType !== "hdpe") return miscDescription;
    const isEndCap = /\bend[\s-]?caps?\b/i.test(miscDescription);
    const lateralAngleMatch = miscDescription.match(/\b(45|60|22\.5|11\.25)\s*(?:deg|°)\s*later/i);
    const isLateral = !!lateralAngleMatch || /\blaterals?\b/i.test(miscDescription);
    if (!isEndCap && !isLateral) return miscDescription;
    const rawSpecsDn = rawSpecs.nominalBoreMm;
    const specsDn = rawSpecsDn ? Number(rawSpecsDn) : null;
    // Resolution order: explicit DN/OD prefix → "X mm diameter"
    // pattern (some BOQ authors write "355 mm diameter" instead
    // of "DN355") → null. Without this second pattern, rows like
    // "HDPE PE100 PN 25 (SDR 7.4) pipe end caps / 1) 355 mm
    // diameter" never resolve and stay un-enriched.
    const dnPrefixMatch = miscDescription.match(/(?:DN|OD)\s*(\d{2,4})/i);
    const dnDiameterMatch = miscDescription.match(/(\d{2,4})\s*mm\s*(?:diameter|dia\.?|Ø)/i);
    const regexDn = dnPrefixMatch
      ? Number(dnPrefixMatch[1])
      : dnDiameterMatch
        ? Number(dnDiameterMatch[1])
        : null;
    const dn = specsDn || regexDn;
    if (!dn || !Number.isFinite(dn)) return miscDescription;
    if (/,\s*\d+mm\s+L\b/.test(miscDescription)) return miscDescription;
    if (/,\s*\d+×\d+mm\b/.test(miscDescription)) return miscDescription;
    if (isEndCap) {
      const length = hdpeEndCapLength(dn);
      if (!length) return miscDescription;
      return `${miscDescription}, ${length}mm L`;
    }
    const angleDeg = lateralAngleMatch ? Number(lateralAngleMatch[1]) : 45;
    const dims = lateralDimensions(angleDeg, dn);
    if (!dims) return miscDescription;
    // Estimated values get an asterisk so the supplier knows the
    // dim is interpolated/extrapolated rather than catalogue.
    const estimatedFlag = dims.source === "estimated" ? "*" : "";
    return `${miscDescription}, ${dims.runFaceToFaceMm}×${dims.branchFaceToCentreMm}mm${estimatedFlag}`;
  })();

  // Compute a fallback weight for known misc categories
  // (end caps, pipe boots, puddle pipes, laterals, UPVC bends,
  // steel-other). Without this every HDPE-Other / PVC-Other /
  // Steel-Other row in the BOQ shows 0 kg even when the row's
  // geometry is fully known from the description.
  const miscPerUnitWeight = fallbackMiscWeight(
    entry,
    miscDescription,
    rawSpecsProductType,
    globalHdpeSdr,
  );
  const miscRowWeight = miscPerUnitWeight * miscQty;

  const existingMisc = dest.get(miscKey);
  if (existingMisc) {
    existingMisc.qty += miscQty;
    existingMisc.weight += miscRowWeight;
    existingMisc.entries.push(itemNumber);
    existingMisc.entryIds.push(entry.id);
  } else {
    dest.set(miscKey, {
      description: enrichedMiscDescription,
      qty: miscQty,
      unit: miscUnit,
      weight: miscRowWeight,
      entries: [itemNumber],
      entryIds: [entry.id],
      material: mat,
    });
  }
}
