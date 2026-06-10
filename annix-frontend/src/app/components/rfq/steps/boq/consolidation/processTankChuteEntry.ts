import { isArray, isNumber } from "es-toolkit/compat";
import { type PlatePart, tankPlateTakeoff, verifyTankMass, weldTakeoff } from "../tankTakeoff";
import type { ConsolidationContext } from "./context";

export function processTankChuteEntry(
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
  // Fabricated tanks / chutes / hoppers / vessels / distributors. They
  // have no nominal bore, so they MUST be caught here — otherwise they
  // fall into the straight-pipe branch below (which defaults NB to 100)
  // and the tank is silently absorbed into a "100NB Steel Pipe" line.
  // Each tank is expanded into its plate parts (mark · thickness · qty ·
  // per-part weight) plus a summary line carrying the steel grade and a
  // stated-vs-computed mass cross-check.
  const rawEntrySpecsTank = entry.specs;
  const rawSpecsTank = rawEntrySpecsTank || {};
  const rawEntryDescriptionTank = entry.description;
  const tankName = rawEntryDescriptionTank || "Fabricated assembly";
  const rawSpecsQuantityValueTank = rawSpecsTank.quantityValue;
  const tankQty = rawSpecsQuantityValueTank || qty || 1;
  const rawSpecsUnitTank = rawSpecsTank.unit;
  const tankUnit = rawSpecsUnitTank ? String(rawSpecsUnitTank) : "Each";
  const rawTankGrade = rawSpecsTank.materialGrade;
  const tankGrade = rawTankGrade ? String(rawTankGrade) : "";
  const rawTankStatedMass = rawSpecsTank.totalSteelWeightKg;
  const statedSteelMassKg = isNumber(rawTankStatedMass) ? rawTankStatedMass : null;
  const rawPlateBom = rawSpecsTank.plateBom;
  const plates: PlatePart[] = isArray(rawPlateBom) ? (rawPlateBom as PlatePart[]) : [];

  // Plate / weld take-off + stated-vs-computed mass cross-check — the maths
  // is the canonical, unit-tested boq/tankTakeoff module.
  const plateTakeoff = tankPlateTakeoff(plates, tankQty);
  const computedSteelMassKg = plateTakeoff.computedSteelMassKg;
  const plateRows = plateTakeoff.rows.map((row, idx) => {
    const rowMark = row.mark;
    const rowDescription = row.description;
    const rowThicknessMm = row.thicknessMm;
    const markLabel = rowMark ? `Mark ${rowMark}` : `Part ${idx + 1}`;
    const plateDesc = rowDescription || "Plate part";
    const thkLabel = rowThicknessMm > 0 ? ` · ${rowThicknessMm}mm PL` : " · thickness TBC";
    return {
      key: `TANKPLATE_${tankName}_${rowMark || idx}_${rowThicknessMm}`,
      description: `    ↳ [${tankName}] ${markLabel}: ${plateDesc}${thkLabel}`,
      qty: row.qty,
      weight: row.weightKg,
    };
  });

  // Weld take-off (size from the drawing's stated fillet, else AISC min;
  // length a geometry estimate) — canonical boq/tankTakeoff module.
  const weld = weldTakeoff(plates, rawSpecsTank, tankQty);
  const weldLengthM = weld.lengthM;
  const weldWeightKg = weld.weightKg;
  const weldFilletLegMm = weld.legMm;
  const weldSizeSource = weld.legSource;

  const headerWeight =
    statedSteelMassKg !== null ? statedSteelMassKg * tankQty : computedSteelMassKg;
  const massCheck = verifyTankMass(statedSteelMassKg, computedSteelMassKg, tankQty);
  const massComputedKg = massCheck.computedKg;
  const massStatedTotalKg = massCheck.statedTotalKg;
  const verifyNote =
    massCheck.status === "verified"
      ? ` · ✓ weight verified (parts ≈ ${Math.round(massComputedKg)}kg vs stated ${Math.round(massStatedTotalKg ?? 0)}kg)`
      : massCheck.status === "check"
        ? ` · ⚠ CHECK WEIGHT: parts ${Math.round(massComputedKg)}kg vs stated ${Math.round(massStatedTotalKg ?? 0)}kg`
        : "";
  // Surface the stated lining / coating m² on the tank header so the
  // supplier can price internal rubber lining (Int m²) and external paint
  // (Ext m²) — the drawing's notes block states both (e.g. rubber 6.45 m²,
  // paint 8.15 m²). Scaled by tank qty, matching the weight column.
  const rawTankLiningArea = rawSpecsTank.liningAreaM2;
  const rawTankCoatingArea = rawSpecsTank.coatingAreaM2;
  const tankLiningAreaM2 =
    isNumber(rawTankLiningArea) && rawTankLiningArea > 0 ? rawTankLiningArea * tankQty : 0;
  const tankCoatingAreaM2 =
    isNumber(rawTankCoatingArea) && rawTankCoatingArea > 0 ? rawTankCoatingArea * tankQty : 0;
  const gradeLabel = tankGrade ? ` — ${tankGrade}` : "";
  const headerKey = `TANK_${tankName.toLowerCase()}`;
  const existingHeader = consolidatedTanks.get(headerKey);
  if (existingHeader) {
    existingHeader.qty += tankQty;
    existingHeader.weight += headerWeight;
    existingHeader.entries.push(itemNumber);
    existingHeader.entryIds.push(entry.id);
    if (tankLiningAreaM2 > 0) {
      const rawExistingInt = existingHeader.intAreaM2;
      existingHeader.intAreaM2 = (rawExistingInt || 0) + tankLiningAreaM2;
    }
    if (tankCoatingAreaM2 > 0) {
      const rawExistingExt = existingHeader.extAreaM2;
      existingHeader.extAreaM2 = (rawExistingExt || 0) + tankCoatingAreaM2;
    }
  } else {
    consolidatedTanks.set(headerKey, {
      description: `${tankName}${gradeLabel}${verifyNote}`,
      qty: tankQty,
      unit: tankUnit,
      weight: headerWeight,
      entries: [itemNumber],
      entryIds: [entry.id],
      material: "steel",
      intAreaM2: tankLiningAreaM2 > 0 ? tankLiningAreaM2 : undefined,
      extAreaM2: tankCoatingAreaM2 > 0 ? tankCoatingAreaM2 : undefined,
    });
  }
  plateRows.forEach((row) => {
    const existingPlate = consolidatedTanks.get(row.key);
    if (existingPlate) {
      existingPlate.qty += row.qty;
      existingPlate.weight += row.weight;
      existingPlate.entries.push(itemNumber);
      existingPlate.entryIds.push(entry.id);
    } else {
      consolidatedTanks.set(row.key, {
        description: row.description,
        qty: row.qty,
        unit: "ea",
        weight: row.weight,
        entries: [itemNumber],
        entryIds: [entry.id],
        material: "steel",
      });
    }
  });
  if (weldLengthM > 0) {
    const weldKey = `TANKWELD_${tankName.toLowerCase()}`;
    const weldDescription = `    ↳ [${tankName}] Welding (estimate): ~${weldLengthM.toFixed(1)} m fillet @ ${weldFilletLegMm}mm leg (${weldSizeSource}) · ~${Math.round(weldWeightKg)} kg weld metal · geometry estimate — confirm on site`;
    const existingWeld = consolidatedTanks.get(weldKey);
    if (existingWeld) {
      existingWeld.weight += weldWeightKg;
      existingWeld.entries.push(itemNumber);
      existingWeld.entryIds.push(entry.id);
      existingWeld.description = weldDescription;
    } else {
      consolidatedTanks.set(weldKey, {
        description: weldDescription,
        qty: 1,
        unit: "lot",
        weight: weldWeightKg,
        entries: [itemNumber],
        entryIds: [entry.id],
        material: "steel",
      });
    }
  }
}
