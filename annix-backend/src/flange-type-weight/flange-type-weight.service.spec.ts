import { Test, TestingModule } from "@nestjs/testing";
import { FlangeWeightTestCase, testScenarios } from "../test/flange-data-test-scenarios";
import { FlangeTypeWeight } from "./entities/flange-type-weight.entity";
import { FlangeTypeWeightRepository } from "./flange-type-weight.repository";
import {
  FlangeTypeWeightService,
  flangeTypeCodeFromDesignation,
} from "./flange-type-weight.service";

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

  describe("flangeTypeCodeFromDesignation", () => {
    it("derives the /type suffix for SABS 1123 designations", () => {
      expect(flangeTypeCodeFromDesignation("1000/3", "SABS 1123")).toBe("/3");
      expect(flangeTypeCodeFromDesignation("600/1", "SANS 1123")).toBe("/1");
    });

    it("derives the /type suffix for BS 4504 designations", () => {
      expect(flangeTypeCodeFromDesignation("10/3", "BS 4504")).toBe("/3");
    });

    it("returns null for non-SANS / non-BS4504 standards", () => {
      expect(flangeTypeCodeFromDesignation("Class 150", "ASME B16.5")).toBeNull();
    });

    it("returns null when the designation has no /type suffix", () => {
      expect(flangeTypeCodeFromDesignation("1000", "SABS 1123")).toBeNull();
    });

    it("returns null for missing inputs", () => {
      expect(flangeTypeCodeFromDesignation(null, "SABS 1123")).toBeNull();
      expect(flangeTypeCodeFromDesignation("1000/3", null)).toBeNull();
    });
  });

  describe("flangeTypeWeightForDesignation", () => {
    it("returns the per-type weight when a row exists (preferred over mass_kg)", async () => {
      mockRepository.findFlangeTypeWeight.mockResolvedValue({
        weight_kg: 100.0,
        flangeStandard: { code: "SABS 1123" },
      } as FlangeTypeWeight);

      const result = await service.flangeTypeWeightForDesignation(1000, "1000/3", "SABS 1123");

      expect(result.found).toBe(true);
      expect(result.weightKg).toBe(100.0);
      // The combined designation is passed through as pressure_class and the
      // derived /3 suffix as the flange_type_code.
      expect(mockRepository.findFlangeTypeWeight).toHaveBeenCalledWith(
        1000,
        "1000/3",
        "/3",
        "SABS 1123",
      );
    });

    it("returns found=false (mass_kg fallback) when no per-type row exists", async () => {
      mockRepository.findFlangeTypeWeight.mockResolvedValue(null);

      const result = await service.flangeTypeWeightForDesignation(1000, "1000/3", "SABS 1123");

      expect(result.found).toBe(false);
      expect(result.weightKg).toBeNull();
    });

    it("returns found=false WITHOUT querying when no type code can be derived", async () => {
      const result = await service.flangeTypeWeightForDesignation(100, "Class 150", "ASME B16.5");

      expect(result.found).toBe(false);
      expect(result.weightKg).toBeNull();
      expect(mockRepository.findFlangeTypeWeight).not.toHaveBeenCalled();
    });

    it("falls back to the standard-agnostic (null) row when no standard-specific row exists", async () => {
      // Production type-weight rows carry a null flange_standard_id, so the
      // standard-specific lookup misses and the resolver must retry with null.
      mockRepository.findFlangeTypeWeight
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ weight_kg: 4.37 } as never);

      const result = await service.flangeTypeWeightForDesignation(125, "1000/3", "SABS 1123");

      expect(result.found).toBe(true);
      expect(result.weightKg).toBe(4.37);
      expect(mockRepository.findFlangeTypeWeight).toHaveBeenNthCalledWith(
        1,
        125,
        "1000/3",
        "/3",
        "SABS 1123",
      );
      expect(mockRepository.findFlangeTypeWeight).toHaveBeenNthCalledWith(
        2,
        125,
        "1000/3",
        "/3",
        null,
      );
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
