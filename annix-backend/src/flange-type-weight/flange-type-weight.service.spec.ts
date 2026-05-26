import { Test, TestingModule } from "@nestjs/testing";
import { FlangeWeightTestCase, testScenarios } from "../test/flange-data-test-scenarios";
import { FlangeTypeWeight } from "./entities/flange-type-weight.entity";
import { FlangeTypeWeightRepository } from "./flange-type-weight.repository";
import { FlangeTypeWeightService } from "./flange-type-weight.service";

describe("FlangeTypeWeightService", () => {
  let service: FlangeTypeWeightService;

  const mockRepository: jest.Mocked<FlangeTypeWeightRepository> = {
    findAllWithStandard: jest.fn(),
    findFlangeTypeWeight: jest.fn(),
    findBlankFlangeWeight: jest.fn(),
    distinctPressureClasses: jest.fn(),
    distinctFlangeTypeCodes: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  } as jest.Mocked<FlangeTypeWeightRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlangeTypeWeightService,
        { provide: FlangeTypeWeightRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<FlangeTypeWeightService>(FlangeTypeWeightService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all flange type weights", async () => {
      const mockData = [{ id: 1, weight_kg: 10 }] as FlangeTypeWeight[];
      mockRepository.findAllWithStandard.mockResolvedValue(mockData);

      const result = await service.findAll();

      expect(result).toEqual(mockData);
      expect(mockRepository.findAllWithStandard).toHaveBeenCalled();
    });
  });

  describe("flangeTypeWeight", () => {
    it("should return weight when found in database", async () => {
      const mockEntity = {
        weight_kg: 0.5,
        flangeStandard: { code: "SANS 1123" },
      } as FlangeTypeWeight;
      mockRepository.findFlangeTypeWeight.mockResolvedValue(mockEntity);

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
      mockRepository.findFlangeTypeWeight.mockResolvedValue(null);

      const result = await service.flangeTypeWeight(100, "PN16", "SANS 1123", "/3");

      expect(result.found).toBe(false);
      expect(result.weightKg).toBe(15);
      expect(result.notes).toContain("Using estimate");
    });

    it("should query without standard when standard is null", async () => {
      mockRepository.findFlangeTypeWeight.mockResolvedValue(null);

      await service.flangeTypeWeight(50, "PN10", null, "WN");

      expect(mockRepository.findFlangeTypeWeight).toHaveBeenCalledWith(50, "PN10", "WN", null);
    });
  });

  describe("blankFlangeWeight", () => {
    it("should return blank flange weight when found", async () => {
      const mockEntity = { weight_kg: 5.5 } as FlangeTypeWeight;
      mockRepository.findBlankFlangeWeight.mockResolvedValue(mockEntity);

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
      mockRepository.findBlankFlangeWeight.mockResolvedValue(null);

      const result = await service.blankFlangeWeight(200, "PN10");

      expect(result.found).toBe(false);
      expect(result.weightKg).toBe(40);
      expect(result.notes).toContain("Using estimate");
    });
  });

  describe("availablePressureClasses", () => {
    it("should return distinct pressure classes", async () => {
      mockRepository.distinctPressureClasses.mockResolvedValue([
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
      mockRepository.distinctFlangeTypeCodes.mockResolvedValue([
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
        mockRepository.findFlangeTypeWeight.mockResolvedValue({
          weight_kg: scenario.expectedValue,
          flangeStandard: { code: input.std },
        } as FlangeTypeWeight);

        const result = await service.flangeTypeWeight(input.nb, input.pc, input.std, input.ftc);

        expect(result.found).toBe(true);
        expect(result.weightKg).toBe(scenario.expectedValue);
      });
    });
  });
});
