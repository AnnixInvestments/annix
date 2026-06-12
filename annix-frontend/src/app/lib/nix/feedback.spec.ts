import { describe, expect, it } from "vitest";
import type { NixExtractedItem } from "./api";
import { buildNixFeedbackCorrections, nixSourceKeyOf } from "./feedback";

const extracted = (overrides: Partial<NixExtractedItem>): NixExtractedItem =>
  ({
    rowNumber: 10,
    itemNumber: "1.1",
    description: "DN 450 rubber lined mild steel pipe",
    itemType: "pipe",
    actionType: "supply",
    material: "mild steel",
    materialGrade: null,
    diameter: 450,
    diameterUnit: "mm",
    secondaryDiameter: null,
    length: 6,
    wallThickness: 8,
    schedule: null,
    angle: null,
    flangeConfig: "both_ends",
    pressureClass: null,
    sdr: null,
    productType: "steel",
    quantity: 12,
    unit: "ea",
    confidence: 0.9,
    needsClarification: false,
    clarificationReason: null,
    sheetName: "BOQ",
    ...overrides,
  }) as NixExtractedItem;

const wizardItem = (overrides: Record<string, unknown>) => ({
  id: "w1",
  itemType: "straight_pipe",
  description: "DN 450 rubber lined mild steel pipe",
  sourceLocation: { rowNumber: 10, sheetName: "BOQ" },
  specs: { nominalBoreMm: 450, wallThicknessMm: 8, quantityValue: 12 },
  ...overrides,
});

describe("nix feedback diff (issue #263)", () => {
  describe("nixSourceKeyOf", () => {
    it("prefers structured sourceLocation", () => {
      expect(nixSourceKeyOf(wizardItem({}) as never)).toBe("BOQ#10");
    });

    it("falls back to the provenance note", () => {
      expect(
        nixSourceKeyOf({
          id: "x",
          itemType: "misc",
          notes: "Extracted by Nix from Sheet 'BOQ' Row 7 (90% confidence)",
        }),
      ).toBe("BOQ#7");
    });

    it("returns null for manual entries", () => {
      expect(nixSourceKeyOf({ id: "x", itemType: "straight_pipe" })).toBeNull();
    });
  });

  describe("buildNixFeedbackCorrections", () => {
    it("returns nothing when the customer changed nothing", () => {
      expect(buildNixFeedbackCorrections([extracted({})], [wizardItem({}) as never])).toEqual([]);
    });

    it("records a field_correction when the diameter was edited", () => {
      const corrections = buildNixFeedbackCorrections(
        [extracted({})],
        [
          wizardItem({
            specs: { nominalBoreMm: 400, wallThicknessMm: 8, quantityValue: 12 },
          }) as never,
        ],
      );
      expect(corrections).toHaveLength(1);
      expect(corrections[0].correctionType).toBe("field_correction");
      expect(corrections[0].changedFields).toEqual(["diameter"]);
      expect(corrections[0].originalRowNumber).toBe(10);
    });

    it("records an item_deletion when the row was removed", () => {
      const corrections = buildNixFeedbackCorrections([extracted({})], []);
      expect(corrections).toHaveLength(1);
      expect(corrections[0].correctionType).toBe("item_deletion");
      expect(corrections[0].correctedItem).toBeNull();
    });

    it("records an item_added for rows without Nix provenance", () => {
      const corrections = buildNixFeedbackCorrections(
        [extracted({})],
        [
          wizardItem({}) as never,
          wizardItem({ id: "w2", sourceLocation: undefined, description: "Manual pipe" }) as never,
        ],
      );
      expect(corrections).toHaveLength(1);
      expect(corrections[0].correctionType).toBe("item_added");
    });

    it("does not treat the meters-to-pipes quantity reshape as a correction", () => {
      const corrections = buildNixFeedbackCorrections(
        [extracted({ unit: "m", quantity: 120 })],
        [
          wizardItem({
            specs: { nominalBoreMm: 450, wallThicknessMm: 8, quantityValue: 20 },
          }) as never,
        ],
      );
      expect(corrections).toEqual([]);
    });

    it("flags a real quantity edit on each-denominated rows", () => {
      const corrections = buildNixFeedbackCorrections(
        [extracted({})],
        [
          wizardItem({
            specs: { nominalBoreMm: 450, wallThicknessMm: 8, quantityValue: 14 },
          }) as never,
        ],
      );
      expect(corrections).toHaveLength(1);
      expect(corrections[0].changedFields).toEqual(["quantity"]);
    });

    it("emits nothing at all when no extraction happened", () => {
      expect(
        buildNixFeedbackCorrections([], [wizardItem({ sourceLocation: undefined }) as never]),
      ).toEqual([]);
    });
  });
});
