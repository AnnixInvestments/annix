import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { BoltMassRepository } from "../bolt-mass/bolt-mass.repository";
import { FlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository";
import { FlangeTypeWeightService } from "../flange-type-weight/flange-type-weight.service";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { Sabs62FittingDimensionRepository } from "../sabs62-fitting-dimension/sabs62-fitting-dimension.repository";
import { Sabs719FittingDimensionRepository } from "../sabs719-fitting-dimension/sabs719-fitting-dimension.repository";
import { SteelSpecificationRepository } from "../steel-specification/steel-specification.repository";
import type { CalculateFittingDto } from "./dto/calculate-fitting.dto";
import { FittingStandard, FittingType } from "./dto/get-fitting-dimensions.dto";
import { FittingService } from "./fitting.service";

describe("FittingService", () => {
  let service: FittingService;

  const mockSabs62Repository = {
    findByTypeAndDiameter: jest.fn(),
    distinctFittingTypes: jest.fn(),
    distinctSizes: jest.fn(),
    distinctAngleRanges: jest.fn(),
  };

  const mockSabs719Repository = {
    findByTypeAndDiameter: jest.fn(),
    distinctFittingTypes: jest.fn(),
    distinctSizes: jest.fn(),
  };

  const mockPipeDimensionRepository = {
    findByNominalDiameterScheduleAndSteel: jest.fn(),
  };

  const mockNbNpsLookupRepository = {
    findByNbMm: jest.fn(),
  };

  const mockFlangeDimensionRepository = {
    findByNominalDiameterStandardAndPressureClassWithBolt: jest.fn(),
    findStandardById: jest.fn(),
    findPressureClassById: jest.fn(),
  };

  const mockFlangeTypeWeightService = {
    flangeTypeWeightForDesignation: jest.fn(),
  };

  const mockBoltMassRepository = {
    findClosestByBoltAndMinLength: jest.fn(),
  };

  const mockNutMassRepository = {
    findByBoltId: jest.fn(),
  };

  const mockSteelSpecRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FittingService,
        {
          provide: Sabs62FittingDimensionRepository,
          useValue: mockSabs62Repository,
        },
        {
          provide: Sabs719FittingDimensionRepository,
          useValue: mockSabs719Repository,
        },
        { provide: PipeDimensionRepository, useValue: mockPipeDimensionRepository },
        { provide: NbNpsLookupRepository, useValue: mockNbNpsLookupRepository },
        { provide: FlangeDimensionRepository, useValue: mockFlangeDimensionRepository },
        { provide: BoltMassRepository, useValue: mockBoltMassRepository },
        { provide: NutMassRepository, useValue: mockNutMassRepository },
        { provide: SteelSpecificationRepository, useValue: mockSteelSpecRepository },
        { provide: FlangeTypeWeightService, useValue: mockFlangeTypeWeightService },
      ],
    }).compile();

    service = module.get<FittingService>(FittingService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculateFitting (SABS719)", () => {
    const pipeRows: Record<number, { mass_kgm: number; wall_thickness_mm: number }> = {
      400: { mass_kgm: 100, wall_thickness_mm: 10 },
      200: { mass_kgm: 25, wall_thickness_mm: 6 },
    };

    const odRows: Record<number, { outside_diameter_mm: number }> = {
      400: { outside_diameter_mm: 406.4 },
      200: { outside_diameter_mm: 219.1 },
    };

    const baseDto = {
      fittingStandard: FittingStandard.SABS719,
      fittingType: FittingType.UNEQUAL_SHORT_TEE,
      nominalDiameterMm: 400,
      pipeLengthAMm: 1000,
      pipeLengthBMm: 1000,
      quantityValue: 1,
      scheduleNumber: "Sch40",
    } as CalculateFittingDto;

    const mockTeeDimensions = (dimensionAMm: number) => {
      mockSabs719Repository.findByTypeAndDiameter.mockResolvedValue({ dimensionAMm });
    };

    const mockPipeRowsByDiameter = () => {
      mockPipeDimensionRepository.findByNominalDiameterScheduleAndSteel.mockImplementation(
        async (nominalDiameterMm: number) => pipeRows[nominalDiameterMm] || null,
      );
      mockNbNpsLookupRepository.findByNbMm.mockImplementation(
        async (nbMm: number) => odRows[nbMm] || null,
      );
    };

    it("weighs the branch of a reducing tee at the branch NB rate when branchDiameterMm is provided", async () => {
      mockTeeDimensions(500);
      mockPipeRowsByDiameter();

      const result = await service.calculateFitting({ ...baseDto, branchDiameterMm: 200 });

      expect(result.runPipeWeightKg).toBe(200);
      expect(result.branchPipeWeightKg).toBe(12.5);
      expect(result.branchPipeWeightPerMeter).toBe(25);
      expect(result.pipeWeight).toBe(212.5);
      expect(
        mockPipeDimensionRepository.findByNominalDiameterScheduleAndSteel,
      ).toHaveBeenCalledWith(200, "Sch40", undefined);
    });

    it("falls back to the main NB rate for the branch when no branchDiameterMm is given", async () => {
      mockTeeDimensions(500);
      mockPipeRowsByDiameter();

      const result = await service.calculateFitting(baseDto);

      expect(result.runPipeWeightKg).toBe(200);
      expect(result.branchPipeWeightKg).toBe(50);
      expect(result.branchPipeWeightPerMeter).toBe(100);
      expect(result.pipeWeight).toBe(250);
      expect(
        mockPipeDimensionRepository.findByNominalDiameterScheduleAndSteel,
      ).not.toHaveBeenCalledWith(200, expect.anything(), undefined);
    });

    it("reuses the main pipe resolution when branchDiameterMm equals the main NB", async () => {
      mockTeeDimensions(500);
      mockPipeRowsByDiameter();

      const result = await service.calculateFitting({ ...baseDto, branchDiameterMm: 400 });

      expect(result.branchPipeWeightPerMeter).toBe(100);
      expect(
        mockPipeDimensionRepository.findByNominalDiameterScheduleAndSteel,
      ).toHaveBeenCalledTimes(1);
    });

    it.each([
      "WT4.5",
      "WT 4.5",
      "WT4.5 (4.5mm)",
      "4.5mm",
    ])("resolves wall-thickness schedule style %s against a WT4.5 pipe row", async (scheduleNumber) => {
      mockTeeDimensions(600);
      mockSteelSpecRepository.findById.mockResolvedValue(null);
      mockPipeDimensionRepository.findByNominalDiameterScheduleAndSteel.mockImplementation(
        async (_nominalDiameterMm: number, scheduleDesignation: string) =>
          scheduleDesignation === "WT4.5" ? { mass_kgm: 44.6, wall_thickness_mm: 4.5 } : null,
      );
      mockNbNpsLookupRepository.findByNbMm.mockResolvedValue({ outside_diameter_mm: 406.4 });

      const result = await service.calculateFitting({
        ...baseDto,
        fittingType: FittingType.SHORT_TEE,
        scheduleNumber,
      });

      expect(result.runPipeWeightKg).toBe(89.2);
      expect(result.branchPipeWeightKg).toBe(26.76);
      expect(result.branchPipeWeightPerMeter).toBe(44.6);
      expect(result.pipeWeight).toBe(115.96);
    });

    it("throws NotFoundException when no schedule format variant matches a pipe row", async () => {
      mockTeeDimensions(600);
      mockPipeDimensionRepository.findByNominalDiameterScheduleAndSteel.mockResolvedValue(null);
      mockNbNpsLookupRepository.findByNbMm.mockResolvedValue({ outside_diameter_mm: 406.4 });

      await expect(
        service.calculateFitting({ ...baseDto, scheduleNumber: "WT9.9" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("flange weight source (mass_kg vs per-type table)", () => {
    const flangeDto = {
      fittingStandard: FittingStandard.SABS62,
      fittingType: FittingType.EQUAL_TEE,
      nominalDiameterMm: 100,
      quantityValue: 1,
      flangeStandardId: 1,
      flangePressureClassId: 2,
    } as CalculateFittingDto;

    beforeEach(() => {
      // SABS62 path: fitting dimensions + OD lookup, no schedule/pipe needed.
      mockSabs62Repository.findByTypeAndDiameter.mockResolvedValue({ centreToFaceCMm: 150 });
      mockNbNpsLookupRepository.findByNbMm.mockResolvedValue({ outside_diameter_mm: 114.3 });
      mockFlangeDimensionRepository.findByNominalDiameterStandardAndPressureClassWithBolt.mockResolvedValue(
        { mass_kg: 3.55, num_holes: 4 },
      );
      mockFlangeDimensionRepository.findStandardById.mockResolvedValue({ code: "SABS 1123" });
      mockFlangeDimensionRepository.findPressureClassById.mockResolvedValue({
        designation: "1000/3",
      });
    });

    it("uses the per-type weight (NOT mass_kg) when a per-type row exists", async () => {
      // mass_kg is 3.55, but the authoritative per-type table says 5.0.
      mockFlangeTypeWeightService.flangeTypeWeightForDesignation.mockResolvedValue({
        found: true,
        weightKg: 5.0,
      });

      const result = await service.calculateFitting(flangeDto);

      // 3 flanges per SABS62 fitting × 5.0 (per-type) = 15.0
      expect(result.flangeWeight).toBe(15);
      expect(mockFlangeTypeWeightService.flangeTypeWeightForDesignation).toHaveBeenCalledWith(
        100,
        "1000/3",
        "SABS 1123",
      );
    });

    it("falls back to mass_kg (unchanged number) when no per-type row exists", async () => {
      mockFlangeTypeWeightService.flangeTypeWeightForDesignation.mockResolvedValue({
        found: false,
        weightKg: null,
      });

      const result = await service.calculateFitting(flangeDto);

      // 3 flanges × 3.55 (mass_kg fallback) = 10.65 — identical to pre-change.
      expect(result.flangeWeight).toBe(10.65);
    });
  });
});
