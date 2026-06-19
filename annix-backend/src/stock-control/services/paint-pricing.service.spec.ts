import { PaintPriceListItem } from "../entities/paint-price-list-item.entity";
import { PaintPricingConfig } from "../entities/paint-pricing-config";
import { PaintPricingService } from "./paint-pricing.service";

const CONFIG: PaintPricingConfig = {
  lossPct: 45,
  applicationCostPerM2: 7.7,
  markupFactor: 1.85,
  discountTiers: [{ name: "MPS", discountPercent: 15 }],
  blastGrades: [],
};

function item(overrides: Partial<PaintPriceListItem>): PaintPriceListItem {
  return {
    id: 1,
    companyId: 1,
    supplierName: "StonCor Africa",
    coatType: null,
    productName: "Carboguard 880",
    paintType: "Epoxy",
    genericType: "epoxy",
    finishType: null,
    zincRich: false,
    mioPigment: false,
    surfaceTolerant: false,
    heatResistanceC: null,
    packSizeLitres: null,
    volumeSolidsPercent: 72,
    costPerLitre: 105,
    costPerKit: null,
    upliftPercent: 0,
    recommendedMicrons: 125,
    micronsOverride: null,
    thinnerName: null,
    thinnerPricePerLitre: null,
    maxThinningPercent: null,
    active: true,
    preferred: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("PaintPricingService", () => {
  const service = new PaintPricingService();

  it("computes coverage, cost/m² and sale/m² from the decoded spreadsheet formulas", () => {
    const result = service.computePricing(item({}), CONFIG);
    expect(result.microns).toBe(125);
    expect(result.flatPlateCoverageM2PerLitre).toBeCloseTo(5.76, 2);
    expect(result.coverageAfterLossM2PerLitre).toBeCloseTo(3.168, 2);
    expect(result.costPerM2).toBeCloseTo(33.14, 1);
    expect(result.salePerM2).toBeCloseTo(75.56, 1);
  });

  it("applies the discount tier off the sale price", () => {
    const result = service.computePricing(item({}), CONFIG);
    const mps = result.tierPrices.find((tier) => tier.name === "MPS");
    expect(mps).toBeDefined();
    expect(mps?.pricePerM2).toBeCloseTo(result.salePerM2 * 0.85, 2);
  });

  it("adds the uplift % to the cost basis", () => {
    const base = service.computePricing(item({}), CONFIG);
    const uplifted = service.computePricing(item({ upliftPercent: 30 }), CONFIG);
    expect(uplifted.costPerM2).toBeCloseTo(base.costPerM2 * 1.3, 1);
  });

  it("adds thinner cost (max rate) without changing coverage", () => {
    const result = service.computePricing(
      item({ maxThinningPercent: 10, thinnerPricePerLitre: 60 }),
      CONFIG,
    );
    expect(result.coverageAfterLossM2PerLitre).toBeCloseTo(3.168, 2);
    expect(result.thinnerCostPerLitre).toBeCloseTo(6, 2);
    expect(result.thinnerCostPerM2).toBeCloseTo(6 / 3.168, 1);
  });

  it("derives cost per litre from cost per kit and pack size", () => {
    const result = service.computePricing(
      item({ costPerLitre: 0, costPerKit: 1050, packSizeLitres: 10 }),
      CONFIG,
    );
    expect(result.paintCostPerLitre).toBeCloseTo(105, 2);
  });

  it("uses the µm override instead of the recommended microns when set", () => {
    const result = service.computePricing(item({ micronsOverride: 200 }), CONFIG);
    expect(result.microns).toBe(200);
    expect(result.flatPlateCoverageM2PerLitre).toBeCloseTo(3.6, 2);
  });

  it("honours a custom loss percentage", () => {
    const at20 = service.computePricing(item({}), { ...CONFIG, lossPct: 20 });
    expect(at20.coverageAfterLossM2PerLitre).toBeCloseTo(5.76 * 0.8, 2);
  });

  it("falls back to the application-cost floor when coverage is zero", () => {
    const result = service.computePricing(
      item({ recommendedMicrons: 0, micronsOverride: null }),
      CONFIG,
    );
    expect(result.coverageAfterLossM2PerLitre).toBe(0);
    expect(result.costPerM2).toBe(0);
    expect(result.salePerM2).toBeCloseTo(CONFIG.applicationCostPerM2 * CONFIG.markupFactor, 2);
  });
});
