import { RubberPriceListItem } from "../entities/rubber-price-list-item.entity";
import { DEFAULT_RUBBER_PRICING_CONFIG } from "../entities/rubber-pricing-config";
import { RubberPricingService } from "./rubber-pricing.service";

function item(overrides: Partial<RubberPriceListItem>): RubberPriceListItem {
  return {
    id: 1,
    companyId: 1,
    supplier: "Rema",
    productCode: "1078",
    productName: null,
    cureType: "steam",
    bondingType: "Natural",
    colour: "Black",
    shoreHardness: 40,
    specificGravity: 1.01,
    costPerKg: 114.6,
    upliftPercent: 0,
    active: true,
    preferred: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("RubberPricingService", () => {
  const service = new RubberPricingService();
  const config = DEFAULT_RUBBER_PRICING_CONFIG;

  it("reproduces the decoded paraffin (curing) cost per m²", () => {
    expect(service.paraffinPerM2(config)).toBeCloseTo(37.81, 1);
  });

  it("reproduces the decoded blasting cost per m²", () => {
    expect(service.blastingPerM2(config)).toBeCloseTo(151.99, 1);
  });

  it("reproduces the decoded plate labour stack total", () => {
    expect(service.labourStack(config, "plate").totalPerM2).toBeCloseTo(471.66, 0);
  });

  it("reproduces the decoded pipe labour stack total", () => {
    expect(service.labourStack(config, "pipe").totalPerM2).toBeCloseTo(240.96, 0);
  });

  it("reproduces the plate natural C&W per m²", () => {
    expect(service.cwPerM2(config, "plate", "Natural")).toBeCloseTo(651.13, 0);
  });

  it("reproduces the pipe natural C&W per m²", () => {
    expect(service.cwPerM2(config, "pipe", "Natural")).toBeCloseTo(441.01, 0);
  });

  it("uses summed live agent sale prices when the whole recipe resolves", () => {
    const recipe = config.plate.cwRecipes?.Natural ?? [];
    const agentSale = 12.5;
    const agents = recipe.map((name) => ({ name, salePerM2: agentSale }));
    const expected = service.labourStack(config, "plate").totalPerM2 + agentSale * recipe.length;
    expect(service.cwPerM2(config, "plate", "Natural", agents)).toBeCloseTo(expected, 6);
  });

  it("falls back to the baseline when an agent in the recipe is missing", () => {
    const recipe = config.plate.cwRecipes?.Natural ?? [];
    const partialAgents = recipe.slice(1).map((name) => ({ name, salePerM2: 12.5 }));
    expect(service.cwPerM2(config, "plate", "Natural", partialAgents)).toBeCloseTo(
      service.cwPerM2(config, "plate", "Natural"),
      6,
    );
  });

  it("matches the plate Rema-Natural sale + MPS price at 3mm (workbook B36 / B57)", () => {
    const result = service.computePricing(item({}), config, { family: "plate" });
    const at3mm = result.thicknesses.find((row) => row.thicknessMm === 3);
    expect(at3mm?.materialPerM2).toBeCloseTo(375.02, 1);
    expect(at3mm?.salePerM2).toBeCloseTo(1307.41, 0);
    expect(at3mm?.mpsPerM2).toBeCloseTo(1045.93, 0);
  });

  it("matches the pipe Rema-Natural sale + MPS price at 3mm (workbook B24 / B34)", () => {
    const result = service.computePricing(item({ costPerKg: 114.59 }), config, { family: "pipe" });
    const at3mm = result.thicknesses.find((row) => row.thicknessMm === 3);
    expect(at3mm?.materialPerM2).toBeCloseTo(364.57, 0);
    expect(at3mm?.salePerM2).toBeCloseTo(1060.77, 0);
    expect(at3mm?.mpsPerM2).toBeCloseTo(848.62, 0);
  });

  it("computeBothFamilies returns plate and pipe results from one family-agnostic item", () => {
    const both = service.computeBothFamilies(item({ costPerKg: 114.59 }), config);
    const plate3mm = both.plate.thicknesses.find((row) => row.thicknessMm === 3);
    const pipe3mm = both.pipe.thicknesses.find((row) => row.thicknessMm === 3);
    expect(both.plate.family).toBe("plate");
    expect(both.pipe.family).toBe("pipe");
    expect(both.plate.runningMetres).toBeNull();
    expect(both.pipe.runningMetres).not.toBeNull();
    expect(pipe3mm?.salePerM2).toBeCloseTo(1060.77, 0);
    expect(pipe3mm?.mpsPerM2).toBeCloseTo(848.62, 0);
    expect(plate3mm?.salePerM2).not.toBeNull();
  });

  it("converts pipe sale per m² to a running-metre price via the NB circumference factor", () => {
    const pipeItem = item({ costPerKg: 114.59 });
    const sale3mm = service.salePerM2(pipeItem, config, 3, { family: "pipe" });
    const rm = service.runningMetrePrice(pipeItem, config, 3, "50NB");
    expect(rm).not.toBeNull();
    expect(rm?.factor).toBeCloseTo(0.2025, 4);
    expect(rm?.salePerMetre).toBeCloseTo(sale3mm * 0.2025, 1);
  });

  it("applies the uplift % on top of the waste factor", () => {
    const base = service.salePerM2(item({}), config, 5, { family: "plate" });
    const uplifted = service.salePerM2(item({ upliftPercent: 10 }), config, 5, { family: "plate" });
    expect(uplifted).toBeGreaterThan(base);
  });

  it("returns no running-metre prices for plate", () => {
    const result = service.computePricing(item({}), config, { family: "plate" });
    expect(result.runningMetres).toBeNull();
  });
});
