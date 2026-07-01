import {
  canonicalForBundleKey,
  canonicalForItem,
  isDualRouteBundleKey,
  normaliseSupplierCategory,
} from "./supplier-category.crosswalk";

describe("supplier-category.crosswalk", () => {
  describe("canonicalForBundleKey", () => {
    it("maps a valve bundle to valves_instruments", () => {
      const result = canonicalForBundleKey("valves-pinch");
      expect(result.categories).toEqual(["valves_instruments"]);
      expect(result.unmatched).toBe(false);
      expect(result.source).toBe("bundle");
    });

    it("dual-routes rubber-lined steel to both fabrication and surface protection", () => {
      const result = canonicalForBundleKey("rubber-lined-steel");
      expect(result.categories).toEqual(["fabricated_steel", "surface_protection"]);
      expect(isDualRouteBundleKey("rubber-lined-steel")).toBe(true);
    });

    it("routes the 'other' bundle to the unmatched bucket", () => {
      const result = canonicalForBundleKey("other");
      expect(result.categories).toEqual([]);
      expect(result.unmatched).toBe(true);
    });

    it("treats an unknown bundle key as unmatched with source none", () => {
      const result = canonicalForBundleKey("something-invented");
      expect(result.unmatched).toBe(true);
      expect(result.source).toBe("none");
    });
  });

  describe("canonicalForItem (fallback)", () => {
    it("maps a steel pipe to fabricated_steel", () => {
      const result = canonicalForItem({ itemType: "pipe", productType: "steel" });
      expect(result.categories).toEqual(["fabricated_steel"]);
      expect(result.source).toBe("item-type");
    });

    it("overrides a hdpe pipe to hdpe via productType", () => {
      const result = canonicalForItem({ itemType: "pipe", productType: "hdpe" });
      expect(result.categories).toEqual(["hdpe"]);
      expect(result.source).toBe("material");
    });

    it("keeps a valve as valves_instruments regardless of productType", () => {
      const result = canonicalForItem({ itemType: "valve", productType: null });
      expect(result.categories).toEqual(["valves_instruments"]);
    });

    it("marks an unknown item as unmatched", () => {
      const result = canonicalForItem({ itemType: "unknown", productType: null });
      expect(result.unmatched).toBe(true);
      expect(result.source).toBe("none");
    });
  });

  describe("normaliseSupplierCategory", () => {
    it("passes through a unified category", () => {
      expect(normaliseSupplierCategory("valves_instruments")).toBe("valves_instruments");
    });

    it("aliases legacy 'valves' to valves_instruments", () => {
      expect(normaliseSupplierCategory("valves")).toBe("valves_instruments");
    });

    it("aliases legacy 'coating' to surface_protection", () => {
      expect(normaliseSupplierCategory("coating")).toBe("surface_protection");
    });

    it("returns null for a non-supply legacy value", () => {
      expect(normaliseSupplierCategory("inspection")).toBeNull();
    });
  });
});
