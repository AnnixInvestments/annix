import { MaterialSpecialization } from "../../supplier/entities/supplier-capability.entity";
import {
  buildSourcingPlan,
  type ExternalCandidate,
  type RegisteredCandidate,
  resolveItemCategories,
  type SourcingItemInput,
} from "./sourcing-matcher";

function item(overrides: Partial<SourcingItemInput> = {}): SourcingItemInput {
  return {
    rowNumber: 1,
    description: "500NB steel pipe",
    quantity: 10,
    unit: "m",
    itemType: "pipe",
    productType: "steel",
    material: "carbon steel",
    diameter: 500,
    diameterUnit: "mm",
    ...overrides,
  };
}

function steelSupplier(overrides: Partial<RegisteredCandidate> = {}): RegisteredCandidate {
  return {
    supplierProfileId: 1,
    name: "Steel Co",
    email: "steel@example.com",
    priority: 1,
    capabilities: [
      {
        category: "fabricated_steel",
        sizeRangeDescription: "DN15 - DN600",
        materialSpecializations: [MaterialSpecialization.CARBON_STEEL],
      },
    ],
    ...overrides,
  };
}

describe("resolveItemCategories", () => {
  it("prefers the bundle key when present", () => {
    const result = resolveItemCategories(item({ bundleKey: "rubber-lined-steel" }));
    expect(result.categories).toEqual(["fabricated_steel", "surface_protection"]);
  });

  it("falls back to item fields when no bundle key", () => {
    const result = resolveItemCategories(item({ bundleKey: null, itemType: "valve" }));
    expect(result.categories).toEqual(["valves_instruments"]);
  });

  it("honours the 'other' bundle as unmatched", () => {
    const result = resolveItemCategories(item({ bundleKey: "other" }));
    expect(result.unmatched).toBe(true);
  });
});

describe("buildSourcingPlan", () => {
  it("routes a steel pipe to a matching registered supplier", () => {
    const plan = buildSourcingPlan([item()], [steelSupplier()], []);
    expect(plan.autoBuckets).toHaveLength(1);
    expect(plan.autoBuckets[0].supplierProfileId).toBe(1);
    expect(plan.autoBuckets[0].category).toBe("fabricated_steel");
    expect(plan.autoBuckets[0].items).toHaveLength(1);
    expect(plan.unmatchedItems).toHaveLength(0);
  });

  it("dual-routes a rubber-lined item to both a steel and a lining supplier", () => {
    const liningSupplier: RegisteredCandidate = {
      supplierProfileId: 2,
      name: "Lining Co",
      email: "lining@example.com",
      priority: 1,
      capabilities: [{ category: "surface_protection" }],
    };
    const plan = buildSourcingPlan(
      [item({ bundleKey: "rubber-lined-steel" })],
      [steelSupplier(), liningSupplier],
      [],
    );
    const categories = plan.autoBuckets.map((b) => b.category).sort();
    expect(categories).toEqual(["fabricated_steel", "surface_protection"]);
    expect(plan.autoBuckets.every((b) => b.items[0].dualRoute)).toBe(true);
  });

  it("sends an unclassifiable item to the unmatched bucket", () => {
    const plan = buildSourcingPlan(
      [item({ bundleKey: "other", itemType: "unknown", productType: null })],
      [steelSupplier()],
      [],
    );
    expect(plan.autoBuckets).toHaveLength(0);
    expect(plan.unmatchedItems).toHaveLength(1);
    expect(plan.unmatchedItems[0].reason).toContain("could not classify");
  });

  it("flags a category with no registered supplier for manual assignment", () => {
    const plan = buildSourcingPlan(
      [item({ itemType: "pump", productType: null })],
      [steelSupplier()],
      [],
    );
    expect(plan.autoBuckets).toHaveLength(0);
    expect(plan.categoriesWithoutSupplier).toContain("pumps");
    expect(plan.unmatchedItems[0].reason).toContain("assign manually");
  });

  it("surfaces external preferred suppliers as manual candidates", () => {
    const external: ExternalCandidate[] = [
      { preferredSupplierId: 9, name: "External Valves", email: "ext@example.com", priority: 2 },
    ];
    const plan = buildSourcingPlan([item()], [steelSupplier()], external);
    expect(plan.manualCandidates).toHaveLength(1);
    expect(plan.manualCandidates[0].preferredSupplierId).toBe(9);
  });

  it("carries a size-out-of-range warning onto the draft line", () => {
    const plan = buildSourcingPlan([item({ diameter: 900 })], [steelSupplier()], []);
    const line = plan.autoBuckets[0].items[0];
    expect(line.warnings.some((w) => w.includes("outside supplier range"))).toBe(true);
  });
});
