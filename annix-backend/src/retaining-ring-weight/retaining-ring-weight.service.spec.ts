import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FlangeWeightTestCase, testScenarios } from "../test/flange-data-test-scenarios";
import { RetainingRingWeight } from "./entities/retaining-ring-weight.entity";
import { RetainingRingWeightService } from "./retaining-ring-weight.service";

describe("RetainingRingWeightService", () => {
  let service: RetainingRingWeightService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetainingRingWeightService,
        {
          provide: getRepositoryToken(RetainingRingWeight),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RetainingRingWeightService>(RetainingRingWeightService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all retaining ring weights ordered by NB", async () => {
      const mockData = [
        { id: 1, nominal_bore_mm: 50, weight_kg: 1.5 },
        { id: 2, nominal_bore_mm: 100, weight_kg: 3.2 },
      ] as RetainingRingWeight[];
      mockRepository.find.mockResolvedValue(mockData);

      const result = await service.findAll();

      expect(result).toEqual(mockData);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { nominal_bore_mm: "ASC" },
      });
    });
  });

  describe("retainingRingWeight", () => {
    it("should return weight when found in database", async () => {
      mockRepository.findOne.mockResolvedValue({
        nominal_bore_mm: 100,
        weight_kg: 2.8,
      });

      const result = await service.retainingRingWeight(100);

      expect(result).toEqual({
        found: true,
        weightKg: 2.8,
        nominalBoreMm: 100,
      });
    });

    it("should return estimated weight when not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.retainingRingWeight(150);

      expect(result.found).toBe(false);
      expect(result.nominalBoreMm).toBe(150);
      expect(result.weightKg).toBeGreaterThan(0);
      expect(result.notes).toContain("Using calculated estimate");
    });

    it("should estimate based on steel density formula", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result50 = await service.retainingRingWeight(50);
      const result100 = await service.retainingRingWeight(100);
      const result200 = await service.retainingRingWeight(200);

      expect(result100.weightKg).toBeGreaterThan(result50.weightKg);
      expect(result200.weightKg).toBeGreaterThan(result100.weightKg);
    });

    it("should query repository with correct NB", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await service.retainingRingWeight(80);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { nominal_bore_mm: 80 },
      });
    });
  });

  describe("test scenarios - retaining_ring", () => {
    const retainingRingScenarios = testScenarios
      .filter((s) => s.type === "retaining_ring" && s.expectedFound)
      .slice(0, 15);

    retainingRingScenarios.forEach((scenario: FlangeWeightTestCase) => {
      it(`should handle ${scenario.description}`, async () => {
        const input = scenario.input as { nb: number };
        mockRepository.findOne.mockResolvedValue({
          nominal_bore_mm: input.nb,
          weight_kg: scenario.expectedValue,
        });

        const result = await service.retainingRingWeight(input.nb);

        expect(result.found).toBe(true);
        expect(result.weightKg).toBe(scenario.expectedValue);
        expect(result.nominalBoreMm).toBe(input.nb);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle very small NB values", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.retainingRingWeight(25);

      expect(result.found).toBe(false);
      expect(result.weightKg).toBeGreaterThan(0);
    });

    it("should handle very large NB values", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.retainingRingWeight(1000);

      expect(result.found).toBe(false);
      expect(result.weightKg).toBeGreaterThan(0);
    });
  });
});
