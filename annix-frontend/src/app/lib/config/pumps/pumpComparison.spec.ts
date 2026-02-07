import { describe, expect, it } from "vitest";
import {
  calculateLifecycleCost,
  compareLifecycleCosts,
  comparePumpQuotes,
  LifecycleCostInputs,
  PumpQuote,
} from "./pumpComparison";

const createMockQuote = (overrides: Partial<PumpQuote> = {}): PumpQuote => ({
  supplierId: 1,
  supplierName: "Test Supplier",
  quoteDate: "2024-01-15",
  items: [
    {
      itemId: "PUMP-001",
      description: "Test Pump",
      pumpType: "centrifugal",
      manufacturer: "TestMfg",
      model: "Model-100",
      quantity: 1,
      unitPrice: 10000,
      totalPrice: 10000,
      specifications: {
        flowRateM3h: 100,
        headM: 30,
        powerKw: 11,
        efficiency: 75,
        npshRequired: 3,
        speedRpm: 1450,
      },
    },
  ],
  totalPrice: 10000,
  currency: "ZAR",
  leadTimeWeeks: 6,
  warrantyMonths: 12,
  ...overrides,
});

describe("Pump Quote Comparison", () => {
  describe("comparePumpQuotes", () => {
    it("should return empty result for empty quotes array", () => {
      const result = comparePumpQuotes([]);
      expect(result.quotes).toHaveLength(0);
      expect(result.priceComparison.lowestPrice).toBe(0);
      expect(result.priceComparison.highestPrice).toBe(0);
      expect(result.priceComparison.bestPriceIndex).toBe(-1);
      expect(result.specificationComparison).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
      expect(result.overallScores).toHaveLength(0);
    });

    it("should handle single quote", () => {
      const quote = createMockQuote();
      const result = comparePumpQuotes([quote]);
      expect(result.quotes).toHaveLength(1);
      expect(result.priceComparison.lowestPrice).toBe(10000);
      expect(result.priceComparison.highestPrice).toBe(10000);
      expect(result.priceComparison.priceSpread).toBe(0);
    });

    it("should calculate price statistics correctly for multiple quotes", () => {
      const quotes = [
        createMockQuote({ supplierId: 1, totalPrice: 10000 }),
        createMockQuote({ supplierId: 2, totalPrice: 15000 }),
        createMockQuote({ supplierId: 3, totalPrice: 12000 }),
      ];
      const result = comparePumpQuotes(quotes);
      expect(result.priceComparison.lowestPrice).toBe(10000);
      expect(result.priceComparison.highestPrice).toBe(15000);
      expect(result.priceComparison.averagePrice).toBeCloseTo(12333.33, 0);
      expect(result.priceComparison.priceSpread).toBe(5000);
      expect(result.priceComparison.priceSpreadPercent).toBeCloseTo(50, 0);
      expect(result.priceComparison.bestPriceIndex).toBe(0);
    });

    it("should compare specifications correctly", () => {
      const quotes = [
        createMockQuote({
          supplierId: 1,
          items: [
            {
              itemId: "P1",
              description: "Pump 1",
              pumpType: "centrifugal",
              quantity: 1,
              unitPrice: 10000,
              totalPrice: 10000,
              specifications: { efficiency: 80, powerKw: 11, npshRequired: 3 },
            },
          ],
        }),
        createMockQuote({
          supplierId: 2,
          items: [
            {
              itemId: "P2",
              description: "Pump 2",
              pumpType: "centrifugal",
              quantity: 1,
              unitPrice: 12000,
              totalPrice: 12000,
              specifications: { efficiency: 75, powerKw: 15, npshRequired: 4 },
            },
          ],
        }),
      ];
      const result = comparePumpQuotes(quotes);

      const efficiencyMetric = result.specificationComparison.find((m) => m.name === "Efficiency");
      expect(efficiencyMetric).toBeDefined();
      expect(efficiencyMetric?.bestIndex).toBe(0);

      const powerMetric = result.specificationComparison.find((m) => m.name === "Motor Power");
      expect(powerMetric).toBeDefined();
      expect(powerMetric?.bestIndex).toBe(0);

      const npshMetric = result.specificationComparison.find((m) => m.name === "NPSHr");
      expect(npshMetric).toBeDefined();
      expect(npshMetric?.bestIndex).toBe(0);
    });

    it("should compare lead times and warranties", () => {
      const quotes = [
        createMockQuote({ supplierId: 1, leadTimeWeeks: 8, warrantyMonths: 12 }),
        createMockQuote({ supplierId: 2, leadTimeWeeks: 4, warrantyMonths: 24 }),
      ];
      const result = comparePumpQuotes(quotes);

      const leadTimeMetric = result.specificationComparison.find((m) => m.name === "Lead Time");
      expect(leadTimeMetric).toBeDefined();
      expect(leadTimeMetric?.bestIndex).toBe(1);

      const warrantyMetric = result.specificationComparison.find((m) => m.name === "Warranty");
      expect(warrantyMetric).toBeDefined();
      expect(warrantyMetric?.bestIndex).toBe(1);
    });

    it("should generate recommendations for single quote", () => {
      const quotes = [createMockQuote()];
      const result = comparePumpQuotes(quotes);
      expect(result.recommendations.some((r) => r.includes("additional quotes"))).toBe(true);
    });

    it("should generate price variation recommendation when spread is high", () => {
      const quotes = [
        createMockQuote({ supplierId: 1, supplierName: "Cheap", totalPrice: 10000 }),
        createMockQuote({ supplierId: 2, supplierName: "Expensive", totalPrice: 20000 }),
      ];
      const result = comparePumpQuotes(quotes);
      expect(result.recommendations.some((r) => r.includes("price variation"))).toBe(true);
    });

    it("should generate efficiency recommendation when efficiency varies significantly", () => {
      const quotes = [
        createMockQuote({
          supplierId: 1,
          items: [
            {
              itemId: "P1",
              description: "Pump",
              pumpType: "centrifugal",
              quantity: 1,
              unitPrice: 10000,
              totalPrice: 10000,
              specifications: { efficiency: 85 },
            },
          ],
        }),
        createMockQuote({
          supplierId: 2,
          items: [
            {
              itemId: "P2",
              description: "Pump",
              pumpType: "centrifugal",
              quantity: 1,
              unitPrice: 10000,
              totalPrice: 10000,
              specifications: { efficiency: 70 },
            },
          ],
        }),
      ];
      const result = comparePumpQuotes(quotes);
      expect(result.recommendations.some((r) => r.toLowerCase().includes("efficiency"))).toBe(true);
    });

    it("should generate NPSH warning when values are high", () => {
      const quotes = [
        createMockQuote({
          supplierId: 1,
          items: [
            {
              itemId: "P1",
              description: "Pump",
              pumpType: "centrifugal",
              quantity: 1,
              unitPrice: 10000,
              totalPrice: 10000,
              specifications: { npshRequired: 8 },
            },
          ],
        }),
        createMockQuote({
          supplierId: 2,
          items: [
            {
              itemId: "P2",
              description: "Pump 2",
              pumpType: "centrifugal",
              quantity: 1,
              unitPrice: 12000,
              totalPrice: 12000,
              specifications: { npshRequired: 6 },
            },
          ],
        }),
      ];
      const result = comparePumpQuotes(quotes);
      expect(result.recommendations.some((r) => r.toLowerCase().includes("npsh"))).toBe(true);
    });

    it("should calculate overall scores", () => {
      const quotes = [
        createMockQuote({ supplierId: 1, supplierName: "Supplier A", totalPrice: 10000 }),
        createMockQuote({ supplierId: 2, supplierName: "Supplier B", totalPrice: 12000 }),
        createMockQuote({ supplierId: 3, supplierName: "Supplier C", totalPrice: 15000 }),
      ];
      const result = comparePumpQuotes(quotes);

      expect(result.overallScores).toHaveLength(3);
      result.overallScores.forEach((score) => {
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
        expect(score.rank).toBeGreaterThanOrEqual(1);
        expect(score.rank).toBeLessThanOrEqual(3);
      });

      const ranks = result.overallScores.map((s) => s.rank);
      expect(ranks.sort()).toEqual([1, 2, 3]);
    });

    it("should recommend best overall value supplier", () => {
      const quotes = [
        createMockQuote({ supplierId: 1, supplierName: "Best Value", totalPrice: 10000 }),
        createMockQuote({ supplierId: 2, supplierName: "Other", totalPrice: 15000 }),
      ];
      const result = comparePumpQuotes(quotes);
      expect(result.recommendations.some((r) => r.includes("Best Value"))).toBe(true);
    });
  });
});

describe("Lifecycle Cost Calculator", () => {
  describe("calculateLifecycleCost", () => {
    const baseInputs: LifecycleCostInputs = {
      purchasePrice: 50000,
      installationCost: 10000,
      powerKw: 15,
      efficiency: 75,
      operatingHoursPerYear: 6000,
      electricityRatePerKwh: 1.5,
      maintenanceCostPerYear: 5000,
      expectedLifeYears: 15,
      discountRate: 8,
    };

    it("should calculate total purchase cost correctly", () => {
      const result = calculateLifecycleCost(baseInputs);
      expect(result.totalPurchaseCost).toBe(60000);
    });

    it("should calculate annual energy cost correctly", () => {
      const result = calculateLifecycleCost(baseInputs);
      const expectedAnnualEnergy = (15 / 0.75) * 6000 * 1.5;
      expect(result.annualEnergyCost).toBeCloseTo(expectedAnnualEnergy, 0);
    });

    it("should calculate total energy cost over lifetime", () => {
      const result = calculateLifecycleCost(baseInputs);
      const expectedTotalEnergy = result.annualEnergyCost * 15;
      expect(result.totalEnergyCost).toBeCloseTo(expectedTotalEnergy, 0);
    });

    it("should calculate total maintenance cost over lifetime", () => {
      const result = calculateLifecycleCost(baseInputs);
      expect(result.totalMaintenanceCost).toBe(75000);
    });

    it("should calculate total lifecycle cost correctly", () => {
      const result = calculateLifecycleCost(baseInputs);
      const expected =
        result.totalPurchaseCost + result.totalEnergyCost + result.totalMaintenanceCost;
      expect(result.totalLifecycleCost).toBeCloseTo(expected, 0);
    });

    it("should calculate NPV lifecycle cost with discount rate", () => {
      const result = calculateLifecycleCost(baseInputs);
      expect(result.npvLifecycleCost).toBeLessThan(result.totalLifecycleCost);
      expect(result.npvLifecycleCost).toBeGreaterThan(result.totalPurchaseCost);
    });

    it("should calculate cost per operating hour", () => {
      const result = calculateLifecycleCost(baseInputs);
      const totalHours = 6000 * 15;
      expect(result.costPerOperatingHour).toBeCloseTo(result.totalLifecycleCost / totalHours, 1);
    });

    it("should calculate energy cost percentage", () => {
      const result = calculateLifecycleCost(baseInputs);
      const expectedPercent = (result.totalEnergyCost / result.totalLifecycleCost) * 100;
      expect(result.energyCostPercent).toBeCloseTo(expectedPercent, 1);
    });

    it("should provide breakdown with correct percentages", () => {
      const result = calculateLifecycleCost(baseInputs);
      expect(result.breakdown).toHaveLength(3);

      const totalPercent = result.breakdown.reduce((sum, b) => sum + b.percent, 0);
      expect(totalPercent).toBeCloseTo(100, 0);

      const purchaseBreakdown = result.breakdown.find((b) => b.category.includes("Purchase"));
      expect(purchaseBreakdown?.cost).toBe(result.totalPurchaseCost);
    });

    it("should handle zero efficiency gracefully", () => {
      const inputs = { ...baseInputs, efficiency: 0 };
      const result = calculateLifecycleCost(inputs);
      expect(result.annualEnergyCost).toBe(15 * 6000 * 1.5);
    });

    it("should handle zero operating hours", () => {
      const inputs = { ...baseInputs, operatingHoursPerYear: 0 };
      const result = calculateLifecycleCost(inputs);
      expect(result.annualEnergyCost).toBe(0);
      expect(result.totalEnergyCost).toBe(0);
      expect(result.costPerOperatingHour).toBe(0);
    });

    it("should increase energy cost with lower efficiency", () => {
      const highEfficiency = calculateLifecycleCost({ ...baseInputs, efficiency: 85 });
      const lowEfficiency = calculateLifecycleCost({ ...baseInputs, efficiency: 65 });
      expect(lowEfficiency.annualEnergyCost).toBeGreaterThan(highEfficiency.annualEnergyCost);
    });

    it("should decrease NPV with higher discount rate", () => {
      const lowDiscount = calculateLifecycleCost({ ...baseInputs, discountRate: 4 });
      const highDiscount = calculateLifecycleCost({ ...baseInputs, discountRate: 12 });
      expect(highDiscount.npvLifecycleCost).toBeLessThan(lowDiscount.npvLifecycleCost);
    });
  });

  describe("compareLifecycleCosts", () => {
    const commonInputs = {
      installationCost: 10000,
      operatingHoursPerYear: 6000,
      electricityRatePerKwh: 1.5,
      maintenanceCostPerYear: 5000,
      expectedLifeYears: 15,
      discountRate: 8,
    };

    it("should compare lifecycle costs for multiple quotes", () => {
      const quotes = [
        createMockQuote({
          supplierId: 1,
          totalPrice: 50000,
          items: [
            {
              itemId: "P1",
              description: "Efficient Pump",
              pumpType: "centrifugal",
              quantity: 1,
              unitPrice: 50000,
              totalPrice: 50000,
              specifications: { powerKw: 15, efficiency: 85 },
            },
          ],
        }),
        createMockQuote({
          supplierId: 2,
          totalPrice: 40000,
          items: [
            {
              itemId: "P2",
              description: "Cheap Pump",
              pumpType: "centrifugal",
              quantity: 1,
              unitPrice: 40000,
              totalPrice: 40000,
              specifications: { powerKw: 18, efficiency: 70 },
            },
          ],
        }),
      ];

      const results = compareLifecycleCosts(quotes, commonInputs);

      expect(results).toHaveLength(2);
      results.forEach((r) => {
        expect(r.quote).toBeDefined();
        expect(r.lifecycleCost).toBeDefined();
        expect(r.lifecycleCost.totalLifecycleCost).toBeGreaterThan(0);
      });
    });

    it("should show higher lifecycle cost for less efficient pump", () => {
      const quotes = [
        createMockQuote({
          supplierId: 1,
          totalPrice: 50000,
          items: [
            {
              itemId: "P1",
              description: "Efficient",
              pumpType: "centrifugal",
              quantity: 1,
              unitPrice: 50000,
              totalPrice: 50000,
              specifications: { powerKw: 15, efficiency: 85 },
            },
          ],
        }),
        createMockQuote({
          supplierId: 2,
          totalPrice: 50000,
          items: [
            {
              itemId: "P2",
              description: "Inefficient",
              pumpType: "centrifugal",
              quantity: 1,
              unitPrice: 50000,
              totalPrice: 50000,
              specifications: { powerKw: 15, efficiency: 65 },
            },
          ],
        }),
      ];

      const results = compareLifecycleCosts(quotes, commonInputs);

      const efficientResult = results.find((r) => r.quote.supplierId === 1);
      const inefficientResult = results.find((r) => r.quote.supplierId === 2);

      expect(efficientResult?.lifecycleCost.totalLifecycleCost).toBeLessThan(
        inefficientResult?.lifecycleCost.totalLifecycleCost ?? 0,
      );
    });

    it("should handle quotes with missing specifications", () => {
      const quotes = [
        createMockQuote({
          supplierId: 1,
          totalPrice: 50000,
          items: [
            {
              itemId: "P1",
              description: "Minimal Specs",
              pumpType: "centrifugal",
              quantity: 1,
              unitPrice: 50000,
              totalPrice: 50000,
              specifications: {},
            },
          ],
        }),
      ];

      const results = compareLifecycleCosts(quotes, commonInputs);
      expect(results).toHaveLength(1);
      expect(results[0].lifecycleCost.totalLifecycleCost).toBeGreaterThan(0);
    });

    it("should handle quotes with no items", () => {
      const quotes = [
        createMockQuote({
          supplierId: 1,
          totalPrice: 50000,
          items: [],
        }),
      ];

      const results = compareLifecycleCosts(quotes, commonInputs);
      expect(results).toHaveLength(1);
    });
  });
});
