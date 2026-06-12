import { isNumber, isString } from "es-toolkit/compat";
import type { NixExtractedItem } from "./api";

export type NixFeedbackCorrectionType =
  | "field_correction"
  | "item_split"
  | "item_merge"
  | "item_deletion"
  | "item_added";

export interface NixFeedbackCorrection {
  originalRowNumber: number | null;
  sheetName?: string | null;
  correctionType: NixFeedbackCorrectionType;
  originalItem: unknown | null;
  correctedItem: unknown | null;
  changedFields?: string[];
}

export interface NixFeedbackPayload {
  extractionId?: number | null;
  userId?: number | null;
  customerId?: number | null;
  corrections: NixFeedbackCorrection[];
}

interface WizardItemShape {
  id: string;
  itemType: string;
  description?: string;
  notes?: string;
  sourceLocation?: { rowNumber: number; sheetName?: string };
  specs?: Record<string, unknown>;
}

const sourceKeyOfExtracted = (item: NixExtractedItem): string => {
  const rawSheet = item.sheetName;
  return `${rawSheet || ""}#${item.rowNumber}`;
};

// Mirrors the provenance recovery used by the wizard store's accept
// dedup: structured sourceLocation first, then the "Extracted by Nix
// from Sheet 'X' Row N" note stamped on every converted entry.
export function nixSourceKeyOf(item: WizardItemShape): string | null {
  const sl = item.sourceLocation;
  const slRow = sl?.rowNumber;
  if (slRow != null) {
    const slSheet = sl?.sheetName;
    return `${slSheet || ""}#${slRow}`;
  }
  const rawNotes = item.notes;
  if (isString(rawNotes)) {
    const m = rawNotes.match(/Sheet '([^']+)' Row (\d+)/);
    if (m) return `${m[1]}#${m[2]}`;
    const m2 = rawNotes.match(/\bRow (\d+)/);
    if (m2) return `#${m2[1]}`;
  }
  return null;
}

const METERS_UNITS = new Set(["m", "meters", "metre", "metres", "lm"]);

const isMetersUnit = (unit: string | null | undefined): boolean =>
  METERS_UNITS.has((unit || "").toLowerCase().trim());

const numericSpec = (specs: Record<string, unknown> | undefined, keys: string[]): number | null => {
  const found = keys
    .map((key) => specs?.[key])
    .find((value) => isNumber(value) && Number.isFinite(value));
  return found === undefined ? null : (found as number);
};

const compactWizardItem = (item: WizardItemShape) => ({
  itemType: item.itemType,
  description: item.description,
  specs: item.specs,
});

function changedFieldsBetween(original: NixExtractedItem, current: WizardItemShape): string[] {
  const diameter = numericSpec(current.specs, ["nominalBoreMm", "nominalDiameterMm"]);
  const wallThickness = numericSpec(current.specs, ["wallThicknessMm"]);
  const quantity = numericSpec(current.specs, ["quantityValue"]);
  return [
    current.description !== undefined && current.description !== original.description
      ? ["description"]
      : [],
    diameter !== null && original.diameter !== null && diameter !== original.diameter
      ? ["diameter"]
      : [],
    wallThickness !== null &&
    original.wallThickness !== null &&
    wallThickness !== original.wallThickness
      ? ["wallThickness"]
      : [],
    // Quantity is only comparable when the source line wasn't in
    // meters — the converter legitimately reshapes meters into pipe
    // counts, which is not a user correction.
    quantity !== null && !isMetersUnit(original.unit) && quantity !== original.quantity
      ? ["quantity"]
      : [],
  ].flat();
}

// Issue #263: the submit-time diff between what Nix extracted and
// what the customer ended up with at Step 3. Each divergence becomes
// a learning correction. Splits/merges are not auto-detected — a
// split shows up as one field_correction plus item_added rows, which
// still carries the signal.
export function buildNixFeedbackCorrections(
  originals: NixExtractedItem[],
  finalItems: WizardItemShape[],
): NixFeedbackCorrection[] {
  if (originals.length === 0) return [];

  const finalBySourceKey = new Map(
    finalItems
      .map((item) => ({ key: nixSourceKeyOf(item), item }))
      .filter((entry): entry is { key: string; item: WizardItemShape } => entry.key !== null)
      .map(({ key, item }) => [key, item] as const),
  );

  const fromOriginals = originals.flatMap((original): NixFeedbackCorrection[] => {
    const current = finalBySourceKey.get(sourceKeyOfExtracted(original));
    const deletedSheet = original.sheetName;
    if (!current) {
      return [
        {
          originalRowNumber: original.rowNumber,
          sheetName: deletedSheet ?? null,
          correctionType: "item_deletion",
          originalItem: original,
          correctedItem: null,
        },
      ];
    }
    const changedFields = changedFieldsBetween(original, current);
    if (changedFields.length === 0) return [];
    return [
      {
        originalRowNumber: original.rowNumber,
        sheetName: deletedSheet ?? null,
        correctionType: "field_correction",
        originalItem: original,
        correctedItem: compactWizardItem(current),
        changedFields,
      },
    ];
  });

  const added = finalItems
    .filter((item) => nixSourceKeyOf(item) === null)
    .map(
      (item): NixFeedbackCorrection => ({
        originalRowNumber: null,
        sheetName: null,
        correctionType: "item_added",
        originalItem: null,
        correctedItem: compactWizardItem(item),
      }),
    );

  return [...fromOriginals, ...added];
}
