import { Test, TestingModule } from "@nestjs/testing";
import { BoltMassRepository } from "../bolt-mass/bolt-mass.repository";
import { FlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { Sabs62FittingDimensionRepository } from "../sabs62-fitting-dimension/sabs62-fitting-dimension.repository";
import { Sabs719FittingDimensionRepository } from "../sabs719-fitting-dimension/sabs719-fitting-dimension.repository";
import { SteelSpecificationRepository } from "../steel-specification/steel-specification.repository";
import { FittingController } from "./fitting.controller";
import { FittingService } from "./fitting.service";

describe("FittingController", () => {
  let controller: FittingController;
  let service: FittingService;

  const mockSabs62Repo = {
    findByTypeAndDiameter: jest.fn(),
    distinctFittingTypes: jest.fn(),
    distinctSizes: jest.fn(),
    distinctAngleRanges: jest.fn(),
  };

  const mockSabs719Repo = {
    findByTypeAndDiameter: jest.fn(),
    distinctFittingTypes: jest.fn(),
    distinctSizes: jest.fn(),
  };

  const mockPipeDimensionRepo = {
    findOneWhere: jest.fn(),
  };

  const mockNbNpsLookupRepo = {
    findOneWhere: jest.fn(),
  };

  const mockFlangeDimensionRepo = {
    findOneWhere: jest.fn(),
  };

  const mockBoltMassRepo = {
    findManyWhere: jest.fn(),
  };

  const mockNutMassRepo = {
    findOneWhere: jest.fn(),
  };

  const mockSteelSpecRepo = {
    findOneWhere: jest.fn(),
  };

  const mockFittingService = {
    calculateFitting: jest.fn(),
    getFittingDimensions: jest.fn(),
    getAvailableFittingTypes: jest.fn(),
    getAvailableSizes: jest.fn(),
    getAvailableAngleRanges: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingController],
      providers: [
        { provide: FittingService, useValue: mockFittingService },
        {
          provide: Sabs62FittingDimensionRepository,
          useValue: mockSabs62Repo,
        },
        {
          provide: Sabs719FittingDimensionRepository,
          useValue: mockSabs719Repo,
        },
        {
          provide: PipeDimensionRepository,
          useValue: mockPipeDimensionRepo,
        },
        {
          provide: NbNpsLookupRepository,
          useValue: mockNbNpsLookupRepo,
        },
        {
          provide: FlangeDimensionRepository,
          useValue: mockFlangeDimensionRepo,
        },
        { provide: BoltMassRepository, useValue: mockBoltMassRepo },
        { provide: NutMassRepository, useValue: mockNutMassRepo },
        {
          provide: SteelSpecificationRepository,
          useValue: mockSteelSpecRepo,
        },
      ],
    }).compile();

    controller = module.get<FittingController>(FittingController);
    service = module.get<FittingService>(FittingService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
