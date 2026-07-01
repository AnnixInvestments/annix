import { MaterialSpecialization } from "../../supplier/entities/supplier-capability.entity";

export interface SizeRangeMm {
  minMm: number;
  maxMm: number;
}

export type PressureUnit = "pn" | "class" | "bar";

export interface PressureRange {
  unit: PressureUnit;
  min: number;
  max: number;
}

const INCH_TO_MM = 25.4;

function numbersIn(text: string): number[] {
  const matches = text.match(/\d+(?:\.\d+)?/g) ?? [];
  return matches.map((value) => Number.parseFloat(value));
}

function looksInch(text: string): boolean {
  return /["″]|\binch(?:es)?\b|\bin\b|\bnps\b/i.test(text);
}

export function parseSizeRangeMm(raw: string | null | undefined): SizeRangeMm | null {
  if (!raw) return null;
  const values = numbersIn(raw);
  if (values.length === 0) return null;
  const scaled = looksInch(raw) ? values.map((value) => value * INCH_TO_MM) : values;
  const minMm = Math.min(...scaled);
  const maxMm = Math.max(...scaled);
  return { minMm, maxMm };
}

function pressureUnitFor(text: string): PressureUnit | null {
  if (/#|\blb\b|\bclass\b|\bansi\b/i.test(text)) return "class";
  if (/\bpn\s*\d/i.test(text)) return "pn";
  if (/\bbar\b|\bkpa\b|\bmpa\b/i.test(text)) return "bar";
  return null;
}

export function parsePressureRange(raw: string | null | undefined): PressureRange | null {
  if (!raw) return null;
  const unit = pressureUnitFor(raw);
  if (!unit) return null;
  const values = numbersIn(raw);
  if (values.length === 0) return null;
  return { unit, min: Math.min(...values), max: Math.max(...values) };
}

export interface ItemSizePressureMaterial {
  diameter: number | null;
  diameterUnit?: "mm" | "inch";
  secondaryDiameter?: number | null;
  material?: string | null;
  materialGrade?: string | null;
  pressureClass?: string | null;
  flangeClass?: string | null;
}

export function itemDiameterMm(item: ItemSizePressureMaterial): number | null {
  if (item.diameter === null || item.diameter === undefined) return null;
  return item.diameterUnit === "inch" ? item.diameter * INCH_TO_MM : item.diameter;
}

export function itemPressure(item: ItemSizePressureMaterial): PressureRange | null {
  return parsePressureRange(item.pressureClass) ?? parsePressureRange(item.flangeClass);
}

const MATERIAL_PATTERNS: Array<{ pattern: RegExp; spec: MaterialSpecialization }> = [
  {
    pattern: /stainless|\bss\b|3(?:04|16|21)|tp3\d\d|duplex/i,
    spec: MaterialSpecialization.STAINLESS_STEEL,
  },
  {
    pattern: /alloy|chrome|\bp1[12]\b|\bp22\b|41(?:30|40)/i,
    spec: MaterialSpecialization.ALLOY_STEEL,
  },
  {
    pattern: /carbon|mild|s355|s275|a106|api\s*5l|sabs?\s*719|sans?\s*719|300wa|grade\s*b/i,
    spec: MaterialSpecialization.CARBON_STEEL,
  },
  { pattern: /hdpe|pe\s*100|pe100|\bsdr\b/i, spec: MaterialSpecialization.HDPE },
  { pattern: /\bu?pvc\b/i, spec: MaterialSpecialization.PVC },
  { pattern: /rubber|linatex|linard|epdm|natural\s*rubber/i, spec: MaterialSpecialization.RUBBER },
];

export function normaliseMaterial(
  ...texts: Array<string | null | undefined>
): MaterialSpecialization | null {
  const joined = texts.filter(Boolean).join(" ");
  if (joined.length === 0) return null;
  const hit = MATERIAL_PATTERNS.find((entry) => entry.pattern.test(joined));
  return hit ? hit.spec : null;
}

export interface SupplierCapabilitySignals {
  sizeRangeDescription?: string | null;
  pressureRatings?: string | null;
  materialSpecializations?: MaterialSpecialization[] | null;
  capabilityScore?: number | null;
}

export interface MatchEvaluation {
  score: number;
  warnings: string[];
  reasons: string[];
}

const SIZE_OUT_OF_RANGE_PENALTY = 40;
const MATERIAL_MISMATCH_PENALTY = 25;
const PRESSURE_OUT_OF_RANGE_PENALTY = 20;

export function evaluateSizePressureMaterial(
  item: ItemSizePressureMaterial,
  capability: SupplierCapabilitySignals,
): MatchEvaluation {
  const diameterMm = itemDiameterMm(item);
  const supplierSize = parseSizeRangeMm(capability.sizeRangeDescription);
  const sizeWarnings =
    diameterMm !== null &&
    supplierSize &&
    (diameterMm < supplierSize.minMm || diameterMm > supplierSize.maxMm)
      ? [
          `size ${Math.round(diameterMm)}mm outside supplier range ${supplierSize.minMm}-${supplierSize.maxMm}mm`,
        ]
      : [];

  const itemMaterial = normaliseMaterial(item.material, item.materialGrade);
  const supplierMaterials = capability.materialSpecializations ?? [];
  const materialWarnings =
    itemMaterial && supplierMaterials.length > 0 && !supplierMaterials.includes(itemMaterial)
      ? [`material ${itemMaterial} not in supplier specialisations`]
      : [];

  const itemPressureRange = itemPressure(item);
  const supplierPressure = parsePressureRange(capability.pressureRatings);
  const pressureComparable =
    itemPressureRange !== null &&
    supplierPressure !== null &&
    itemPressureRange.unit === supplierPressure.unit;
  const pressureWarnings =
    pressureComparable &&
    itemPressureRange &&
    supplierPressure &&
    itemPressureRange.max > supplierPressure.max
      ? [
          `pressure ${itemPressureRange.max}${itemPressureRange.unit} exceeds supplier max ${supplierPressure.max}${supplierPressure.unit}`,
        ]
      : [];

  const reasons = [
    diameterMm !== null && supplierSize && sizeWarnings.length === 0 ? "size in range" : null,
    itemMaterial && supplierMaterials.includes(itemMaterial) ? "material matched" : null,
    pressureComparable && pressureWarnings.length === 0 ? "pressure in range" : null,
  ].filter((reason): reason is string => reason !== null);

  const penalties =
    sizeWarnings.length * SIZE_OUT_OF_RANGE_PENALTY +
    materialWarnings.length * MATERIAL_MISMATCH_PENALTY +
    pressureWarnings.length * PRESSURE_OUT_OF_RANGE_PENALTY;

  const capabilityBoost = Math.round(((capability.capabilityScore ?? 0) / 100) * 10);
  const score = Math.max(0, Math.min(100, 100 - penalties + capabilityBoost - 10));

  return {
    score,
    warnings: [...sizeWarnings, ...materialWarnings, ...pressureWarnings],
    reasons,
  };
}
