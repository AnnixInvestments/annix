import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NominalOutsideDiameterMm } from "../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { SteelSpecification } from "../steel-specification/entities/steel-specification.entity";
import { PipeDimension } from "./entities/pipe-dimension.entity";
import { PipeDimensionController } from "./pipe-dimension.controller";
import { PipeDimensionService } from "./pipe-dimension.service";

describe("PipeDimensionController", () => {
  let controller: PipeDimensionController;
  let service: PipeDimensionService;

  const mockPipeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockNominalRepo = {
    findOne: jest.fn(),
  };

  const mockSteelRepo = {
    findOne: jest.fn(),
  };

  const mockPipeDimensionService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getRecommendedSpecs: jest.fn(),
    getHigherSchedules: jest.fn(),
    findAllBySpecAndNominal: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipeDimensionController],
      providers: [
        { provide: PipeDimensionService, useValue: mockPipeDimensionService },
        { provide: getRepositoryToken(PipeDimension), useValue: mockPipeRepo },
        {
          provide: getRepositoryToken(NominalOutsideDiameterMm),
          useValue: mockNominalRepo,
        },
        {
          provide: getRepositoryToken(SteelSpecification),
          useValue: mockSteelRepo,
        },
      ],
    }).compile();

    controller = module.get<PipeDimensionController>(PipeDimensionController);
    service = module.get<PipeDimensionService>(PipeDimensionService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
