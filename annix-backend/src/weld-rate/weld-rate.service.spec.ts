import { Test, TestingModule } from "@nestjs/testing";
import { WeldRateService } from "./weld-rate.service";

describe("WeldRateService", () => {
  let service: WeldRateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeldRateService],
    }).compile();

    service = module.get<WeldRateService>(WeldRateService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("costPerMetre", () => {
    it("should calculate CO2 cost per metre close to reference value", () => {
      const result = service.costPerMetre("CO2");

      expect(result.consumableType).toBe("CO2");
      expect(result.totalCostPerMetre).toBeCloseTo(24.01, 0);
      expect(result.gasCostPerMetre).toBeGreaterThan(0);
      expect(result.fillerCostPerMetre).toBeGreaterThan(0);
      expect(result.laborCostPerMetre).toBeGreaterThan(0);
    });

    it("should calculate Fluxcore cost per metre close to reference value", () => {
      const result = service.costPerMetre("FLUXCORE");

      expect(result.consumableType).toBe("FLUXCORE");
      expect(result.totalCostPerMetre).toBeCloseTo(26.63, 0);
    });

    it("should calculate Argon cost per metre close to reference value", () => {
      const result = service.costPerMetre("ARGON");

      expect(result.consumableType).toBe("ARGON");
      expect(result.totalCostPerMetre).toBeCloseTo(58.16, 0);
    });

    it("should have Argon as most expensive due to slower weld rate", () => {
      const co2 = service.costPerMetre("CO2");
      const fluxcore = service.costPerMetre("FLUXCORE");
      const argon = service.costPerMetre("ARGON");

      expect(argon.totalCostPerMetre).toBeGreaterThan(fluxcore.totalCostPerMetre);
      expect(fluxcore.totalCostPerMetre).toBeGreaterThan(co2.totalCostPerMetre);
    });
  });

  describe("runsForThickness", () => {
    it("should return 1 run for thin walls (<=6mm)", () => {
      expect(service.runsForThickness(4)).toBe(1);
      expect(service.runsForThickness(6)).toBe(1);
    });

    it("should return 2 runs for medium walls (6-10mm)", () => {
      expect(service.runsForThickness(8)).toBe(2);
      expect(service.runsForThickness(10)).toBe(2);
    });

    it("should return 3 runs for thicker walls (10-16mm)", () => {
      expect(service.runsForThickness(12)).toBe(3);
      expect(service.runsForThickness(16)).toBe(3);
    });

    it("should return more runs for very thick walls", () => {
      expect(service.runsForThickness(20)).toBe(4);
      expect(service.runsForThickness(30)).toBe(5);
      expect(service.runsForThickness(50)).toBe(6);
    });
  });

  describe("calculatePipeWeldCost", () => {
    it("should calculate circumferential weld length correctly", () => {
      const result = service.calculatePipeWeldCost(456, 10, "CO2");

      const expectedLengthPerRun = Math.PI * 456;
      expect(result.weldLengthPerRunMm).toBeCloseTo(expectedLengthPerRun, 1);
      expect(result.numberOfRuns).toBe(2);
      expect(result.totalWeldLengthMm).toBeCloseTo(expectedLengthPerRun * 2, 1);
    });

    it("should calculate total cost based on weld length", () => {
      const result = service.calculatePipeWeldCost(456, 10, "CO2");

      const breakdown = service.costPerMetre("CO2");
      const expectedCost = (result.totalWeldLengthMm / 1000) * breakdown.totalCostPerMetre;
      expect(result.totalCost).toBeCloseTo(expectedCost, 1);
    });

    it("should allow custom number of runs", () => {
      const result = service.calculatePipeWeldCost(456, 10, "CO2", 3);

      expect(result.numberOfRuns).toBe(3);
    });
  });

  describe("calculateLinearWeldCost", () => {
    it("should calculate cost for 1 metre of weld", () => {
      const result = service.calculateLinearWeldCost(1000, "CO2");

      expect(result.weldLengthMm).toBe(1000);
      expect(result.totalCost).toBeCloseTo(24.01, 0);
    });

    it("should scale cost linearly with length", () => {
      const result1m = service.calculateLinearWeldCost(1000, "CO2");
      const result2m = service.calculateLinearWeldCost(2000, "CO2");

      expect(result2m.totalCost).toBeCloseTo(result1m.totalCost * 2, 1);
    });
  });

  describe("allConsumableCosts", () => {
    it("should return costs for all three consumable types", () => {
      const costs = service.allConsumableCosts();

      expect(costs).toHaveLength(3);
      expect(costs.map((c) => c.consumableType)).toContain("CO2");
      expect(costs.map((c) => c.consumableType)).toContain("FLUXCORE");
      expect(costs.map((c) => c.consumableType)).toContain("ARGON");
    });
  });

  describe("welderHourlyRate", () => {
    it("should return the default welder hourly rate", () => {
      expect(service.welderHourlyRate()).toBe(140);
    });
  });
});
