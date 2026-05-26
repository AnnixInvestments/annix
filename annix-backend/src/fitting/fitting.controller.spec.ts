import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BoltMass } from "../bolt-mass/entities/bolt-mass.entity";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { NbNpsLookup } from "../nb-nps-lookup/entities/nb-nps-lookup.entity";
import { NutMass } from "../nut-mass/entities/nut-mass.entity";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { Sabs62FittingDimensionRepository } from "../sabs62-fitting-dimension/sabs62-fitting-dimension.repository";
import { Sabs719FittingDimensionRepository } from "../sabs719-fitting-dimension/sabs719-fitting-dimension.repository";
import { SteelSpecification } from "../steel-specification/entities/steel-specification.entity";
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
    findOne: jest.fn(),
  };

  const mockNbNpsLookupRepo = {
    findOne: jest.fn(),
  };

  const mockFlangeDimensionRepo = {
    findOne: jest.fn(),
  };

  const mockBoltMassRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockNutMassRepo = {
    findOne: jest.fn(),
  };

  const mockSteelSpecRepo = {
    findOne: jest.fn(),
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
          provide: getRepositoryToken(PipeDimension),
          useValue: mockPipeDimensionRepo,
        },
        {
          provide: getRepositoryToken(NbNpsLookup),
          useValue: mockNbNpsLookupRepo,
        },
        {
          provide: getRepositoryToken(FlangeDimension),
          useValue: mockFlangeDimensionRepo,
        },
        { provide: getRepositoryToken(BoltMass), useValue: mockBoltMassRepo },
        { provide: getRepositoryToken(NutMass), useValue: mockNutMassRepo },
        {
          provide: getRepositoryToken(SteelSpecification),
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
