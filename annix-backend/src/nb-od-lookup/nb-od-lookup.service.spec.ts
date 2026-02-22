import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FlangeWeightTestCase, testScenarios } from "../test/flange-data-test-scenarios";
import { NbOdLookup } from "./entities/nb-od-lookup.entity";
import { NbOdLookupService } from "./nb-od-lookup.service";

describe("NbOdLookupService", () => {
  let service: NbOdLookupService;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NbOdLookupService,
        {
          provide: getRepositoryToken(NbOdLookup),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<NbOdLookupService>(NbOdLookupService);

    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all NB to OD mappings ordered by NB", async () => {
      const mockData = [
        { id: 1, nominal_bore_mm: 15, outside_diameter_mm: 21.3 },
        { id: 2, nominal_bore_mm: 20, outside_diameter_mm: 26.9 },
      ] as NbOdLookup[];
      mockRepository.find.mockResolvedValue(mockData);

      const result = await service.findAll();

      expect(result).toEqual(mockData);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { nominal_bore_mm: "ASC" },
      });
    });
  });

  describe("nbToOd", () => {
    it("should return OD when found in database", async () => {
      mockRepository.findOne.mockResolvedValue({
        nominal_bore_mm: 50,
        outside_diameter_mm: 60.3,
      });

      const result = await service.nbToOd(50);

      expect(result).toEqual({
        found: true,
        nominalBoreMm: 50,
        outsideDiameterMm: 60.3,
      });
    });

    it("should return estimated OD when not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.nbToOd(75);

      expect(result).toEqual({
        found: false,
        nominalBoreMm: 75,
        outsideDiameterMm: 82.5,
        notes: "No data found for NB75. Using estimate (NB x 1.1).",
      });
    });

    it("should query repository with correct NB", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await service.nbToOd(100);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { nominal_bore_mm: 100 },
      });
    });

    it("should handle common NB values", async () => {
      const commonNBs = [15, 20, 25, 32, 40, 50, 65, 80, 100, 150, 200, 250, 300];

      for (const nb of commonNBs) {
        mockRepository.findOne.mockResolvedValue({
          nominal_bore_mm: nb,
          outside_diameter_mm: nb * 1.2,
        });

        const result = await service.nbToOd(nb);
        expect(result.found).toBe(true);
        expect(result.nominalBoreMm).toBe(nb);
      }
    });
  });

  describe("availableNominalBores", () => {
    it("should return distinct nominal bore values", async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { nominalBoreMm: 15 },
        { nominalBoreMm: 20 },
        { nominalBoreMm: 25 },
        { nominalBoreMm: 32 },
      ]);

      const result = await service.availableNominalBores();

      expect(result).toEqual([15, 20, 25, 32]);
    });
  });

  describe("test scenarios - nb_od_lookup", () => {
    const nbOdScenarios = testScenarios
      .filter((s) => s.type === "nb_od_lookup" && s.expectedFound)
      .slice(0, 15);

    nbOdScenarios.forEach((scenario: FlangeWeightTestCase) => {
      it(`should handle ${scenario.description}`, async () => {
        const input = scenario.input as { nb: number };
        mockRepository.findOne.mockResolvedValue({
          nominal_bore_mm: input.nb,
          outside_diameter_mm: scenario.expectedValue,
        });

        const result = await service.nbToOd(input.nb);

        expect(result.found).toBe(true);
        expect(result.outsideDiameterMm).toBe(scenario.expectedValue);
        expect(result.nominalBoreMm).toBe(input.nb);
      });
    });
  });

  describe("edge cases", () => {
    it("should estimate OD for non-standard NB", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.nbToOd(45);

      expect(result.found).toBe(false);
      expect(result.outsideDiameterMm).toBeCloseTo(49.5, 1);
    });

    it("should handle very large NB values", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.nbToOd(1000);

      expect(result.found).toBe(false);
      expect(result.outsideDiameterMm).toBe(1100);
    });
  });
});
