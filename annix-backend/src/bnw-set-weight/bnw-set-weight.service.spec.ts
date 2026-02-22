import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FlangeWeightTestCase, testScenarios } from "../test/flange-data-test-scenarios";
import { BnwSetWeightService } from "./bnw-set-weight.service";
import { BnwSetWeight } from "./entities/bnw-set-weight.entity";

describe("BnwSetWeightService", () => {
  let service: BnwSetWeightService;

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
        BnwSetWeightService,
        {
          provide: getRepositoryToken(BnwSetWeight),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BnwSetWeightService>(BnwSetWeightService);

    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all BNW set weights", async () => {
      const mockData = [{ id: 1, nominal_bore_mm: 50, pressure_class: "PN16" }] as BnwSetWeight[];
      mockRepository.find.mockResolvedValue(mockData);

      const result = await service.findAll();

      expect(result).toEqual(mockData);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe("bnwSetInfo", () => {
    it("should return BNW set info when found", async () => {
      const mockEntity = {
        bolt_size: "M16x70",
        weight_per_hole_kg: 0.25,
        num_holes: 4,
      };
      mockRepository.findOne.mockResolvedValue(mockEntity);

      const result = await service.bnwSetInfo(50, "PN16");

      expect(result).toEqual({
        found: true,
        boltSize: "M16x70",
        weightPerHoleKg: 0.25,
        numHoles: 4,
        totalWeightKg: 1.0,
        pressureClass: "PN16",
        nominalBoreMm: 50,
      });
    });

    it("should return defaults when not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.bnwSetInfo(999, "PN99");

      expect(result.found).toBe(false);
      expect(result.boltSize).toBe("M16x65");
      expect(result.weightPerHoleKg).toBe(0.18);
      expect(result.numHoles).toBe(8);
      expect(result.totalWeightKg).toBe(1.44);
      expect(result.notes).toContain("Using defaults");
    });

    it("should calculate total weight correctly", async () => {
      const mockEntity = {
        bolt_size: "M20x80",
        weight_per_hole_kg: 0.35,
        num_holes: 12,
      };
      mockRepository.findOne.mockResolvedValue(mockEntity);

      const result = await service.bnwSetInfo(200, "PN40");

      expect(result.totalWeightKg).toBeCloseTo(4.2, 1);
    });
  });

  describe("availablePressureClasses", () => {
    it("should return distinct pressure classes", async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { pressureClass: "PN10" },
        { pressureClass: "PN16" },
        { pressureClass: "PN25" },
      ]);

      const result = await service.availablePressureClasses();

      expect(result).toEqual(["PN10", "PN16", "PN25"]);
    });
  });

  describe("test scenarios - bnw_set", () => {
    const bnwSetScenarios = testScenarios
      .filter((s) => s.type === "bnw_set" && s.expectedFound)
      .slice(0, 15);

    bnwSetScenarios.forEach((scenario: FlangeWeightTestCase) => {
      it(`should handle ${scenario.description}`, async () => {
        const input = scenario.input as { nb: number; pc: string };
        mockRepository.findOne.mockResolvedValue({
          bolt_size: "M16x65",
          weight_per_hole_kg: 0.18,
          num_holes: 8,
        });

        const result = await service.bnwSetInfo(input.nb, input.pc);

        expect(result.found).toBe(true);
        expect(result.nominalBoreMm).toBe(input.nb);
        expect(result.pressureClass).toBe(input.pc);
      });
    });
  });
});
