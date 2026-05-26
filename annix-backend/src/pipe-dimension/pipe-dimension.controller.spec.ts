import { Test, TestingModule } from "@nestjs/testing";
import { PipeDimensionController } from "./pipe-dimension.controller";
import { PipeDimensionRepository } from "./pipe-dimension.repository";
import { PipeDimensionService } from "./pipe-dimension.service";

describe("PipeDimensionController", () => {
  let controller: PipeDimensionController;
  let service: PipeDimensionService;

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

  const mockPipeDimensionRepository: jest.Mocked<PipeDimensionRepository> = {
    findAllWithRelations: jest.fn(),
    findAllWithDiameterAndSpec: jest.fn(),
    findOneWithRelations: jest.fn(),
    findNominalByDiameter: jest.fn(),
    findNominalById: jest.fn(),
    findSteelById: jest.fn(),
    createPipe: jest.fn(),
    savePipe: jest.fn(),
    removePipe: jest.fn(),
    findBySpecAndNominal: jest.fn(),
    recommendedSpecs: jest.fn(),
    higherSchedules: jest.fn(),
    findByNominalDiameterScheduleAndSteel: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  } as jest.Mocked<PipeDimensionRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipeDimensionController],
      providers: [
        { provide: PipeDimensionService, useValue: mockPipeDimensionService },
        { provide: PipeDimensionRepository, useValue: mockPipeDimensionRepository },
      ],
    }).compile();

    controller = module.get<PipeDimensionController>(PipeDimensionController);
    service = module.get<PipeDimensionService>(PipeDimensionService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should have service defined", () => {
    expect(service).toBeDefined();
  });
});
