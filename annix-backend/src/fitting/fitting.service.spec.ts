import { Test, TestingModule } from "@nestjs/testing";
import { BoltMassRepository } from "../bolt-mass/bolt-mass.repository";
import { FlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { Sabs62FittingDimensionRepository } from "../sabs62-fitting-dimension/sabs62-fitting-dimension.repository";
import { Sabs719FittingDimensionRepository } from "../sabs719-fitting-dimension/sabs719-fitting-dimension.repository";
import { SteelSpecificationRepository } from "../steel-specification/steel-specification.repository";
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
      ],
    }).compile();

    service = module.get<FittingService>(FittingService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
