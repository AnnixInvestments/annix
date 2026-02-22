import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FlangeWeightTestCase, testScenarios } from "../test/flange-data-test-scenarios";
import { FlangeTypeWeight } from "./entities/flange-type-weight.entity";
import { FlangeTypeWeightService } from "./flange-type-weight.service";

describe("FlangeTypeWeightService", () => {
  let service: FlangeTypeWeightService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  const mockRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlangeTypeWeightService,
        {
          provide: getRepositoryToken(FlangeTypeWeight),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FlangeTypeWeightService>(FlangeTypeWeightService);

    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all flange type weights", async () => {
      const mockData = [{ id: 1, weight_kg: 10 }] as FlangeTypeWeight[];
      mockRepository.find.mockResolvedValue(mockData);

      const result = await service.findAll();

      expect(result).toEqual(mockData);
      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ["flangeStandard"],
      });
    });
  });

  describe("flangeTypeWeight", () => {
    it("should return weight when found in database", async () => {
      const mockEntity = {
        weight_kg: 0.5,
        flangeStandard: { code: "SANS 1123" },
      };
      mockQueryBuilder.getOne.mockResolvedValue(mockEntity);

      const result = await service.flangeTypeWeight(15, "PN6", "SANS 1123", "/3");

      expect(result).toEqual({
        found: true,
        weightKg: 0.5,
        nominalBoreMm: 15,
        pressureClass: "PN6",
        flangeTypeCode: "/3",
        flangeStandardCode: "SANS 1123",
      });
    });

    it("should return estimated weight when not found", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.flangeTypeWeight(100, "PN16", "SANS 1123", "/3");

      expect(result.found).toBe(false);
      expect(result.weightKg).toBe(15);
      expect(result.notes).toContain("Using estimate");
    });

    it("should query without standard when standard is null", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await service.flangeTypeWeight(50, "PN10", null, "WN");

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("ftw.flange_standard_id IS NULL");
    });
  });

  describe("blankFlangeWeight", () => {
    it("should return blank flange weight when found", async () => {
      const mockEntity = { weight_kg: 5.5 };
      mockQueryBuilder.getOne.mockResolvedValue(mockEntity);

      const result = await service.blankFlangeWeight(100, "PN16");

      expect(result).toEqual({
        found: true,
        weightKg: 5.5,
        nominalBoreMm: 100,
        pressureClass: "PN16",
        flangeTypeCode: "BLANK",
        flangeStandardCode: null,
      });
    });

    it("should return estimated weight when blank flange not found", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.blankFlangeWeight(200, "PN10");

      expect(result.found).toBe(false);
      expect(result.weightKg).toBe(40);
      expect(result.notes).toContain("Using estimate");
    });
  });

  describe("availablePressureClasses", () => {
    it("should return distinct pressure classes", async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { pressureClass: "PN6" },
        { pressureClass: "PN10" },
        { pressureClass: "PN16" },
      ]);

      const result = await service.availablePressureClasses();

      expect(result).toEqual(["PN6", "PN10", "PN16"]);
    });
  });

  describe("availableFlangeTypes", () => {
    it("should return distinct flange types", async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { flangeTypeCode: "/3" },
        { flangeTypeCode: "WN" },
        { flangeTypeCode: "BLANK" },
      ]);

      const result = await service.availableFlangeTypes();

      expect(result).toEqual(["/3", "WN", "BLANK"]);
    });
  });

  describe("test scenarios - flange_weight", () => {
    const flangeWeightScenarios = testScenarios
      .filter((s) => s.type === "flange_weight" && s.expectedFound)
      .slice(0, 20);

    flangeWeightScenarios.forEach((scenario: FlangeWeightTestCase) => {
      it(`should handle ${scenario.description}`, async () => {
        const input = scenario.input as {
          nb: number;
          pc: string;
          ftc: string;
          std: string;
        };
        mockQueryBuilder.getOne.mockResolvedValue({
          weight_kg: scenario.expectedValue,
          flangeStandard: { code: input.std },
        });

        const result = await service.flangeTypeWeight(input.nb, input.pc, input.std, input.ftc);

        expect(result.found).toBe(true);
        expect(result.weightKg).toBe(scenario.expectedValue);
      });
    });
  });
});
