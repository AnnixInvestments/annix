import { combineClassWithFlangeType } from "@/app/lib/utils/rfqFlangeCalculations";

// Subset of masterData / globalSpecs the spec helpers actually read.
// Keeps the helpers honest about their dependencies and lets specs
// pass small literal fixtures instead of mocking the full RfqWizard
// store shape.
export interface FlangeSpecLookup {
  globalFlangeStandardId: number | null | undefined;
  globalFlangePressureClassId: number | null | undefined;
  globalFlangeTypeCode?: string | null;
  flangeStandards: ReadonlyArray<{ id: number; code: string }> | undefined;
  pressureClasses: ReadonlyArray<{ id: number; designation: string }> | undefined;
}

export interface SteelSpecLookup {
  globalSteelSpecificationId: number | null | undefined;
  steelSpecs: ReadonlyArray<{ id: number; steelSpecName: string }> | undefined;
}

// Build the flange-spec string used in row descriptions. Falls back
// through entry-level → global → "PN16" default when ids are absent
// or master-data lookup misses.
export const getFlangeSpec = (entry: any, lookup: FlangeSpecLookup): string => {
  const rawFlangeStandardId = entry.specs?.flangeStandardId;
  const flangeStandardId = rawFlangeStandardId || lookup.globalFlangeStandardId;
  const rawFlangePressureClassId = entry.specs?.flangePressureClassId;
  const flangePressureClassId = rawFlangePressureClassId || lookup.globalFlangePressureClassId;
  const flangeStandard =
    flangeStandardId && lookup.flangeStandards
      ? lookup.flangeStandards.find((s) => s.id === flangeStandardId)?.code
      : "";
  const pressureClass =
    flangePressureClassId && lookup.pressureClasses
      ? lookup.pressureClasses.find((p) => p.id === flangePressureClassId)?.designation
      : "";
  if (!flangeStandard || !pressureClass) return "PN16";
  // Recombine the class with the SELECTED flange type — the stored
  // (class,type) row id may carry a different type suffix (e.g. "1000/1"
  // stored while the user chose Slip-On /3), which mislabels rows and
  // breaks weight lookups downstream.
  const rawFlangeTypeCode = entry.specs?.flangeTypeCode;
  const flangeTypeCode = rawFlangeTypeCode || lookup.globalFlangeTypeCode;
  const combined = combineClassWithFlangeType(pressureClass, flangeTypeCode, flangeStandard);
  return `${flangeStandard} ${combined}`;
};

// Build the steel-spec name for row descriptions. Falls back to
// "Steel" when the entry has no spec id, the global has no id, or
// the masterData lookup misses.
export const getSteelSpecName = (entry: any, lookup: SteelSpecLookup): string => {
  const rawSteelSpecificationId = entry.specs?.steelSpecificationId;
  const steelSpecId = rawSteelSpecificationId || lookup.globalSteelSpecificationId;
  const rawSteelSpecName = lookup.steelSpecs?.find((s) => s.id === steelSpecId)?.steelSpecName;
  return steelSpecId && lookup.steelSpecs ? rawSteelSpecName || "Steel" : "Steel";
};
