import { Test, TestingModule } from "@nestjs/testing";
import { FittingDimensionController } from "./fitting-dimension.controller";
import { FittingDimensionService } from "./fitting-dimension.service";

describe("FittingDimensionController", () => {
  let controller: FittingDimensionController;
  let service: FittingDimensionService;

  const mockFittingDimensionService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingDimensionController],
      providers: [
        {
          provide: FittingDimensionService,
          useValue: mockFittingDimensionService,
        },
      ],
    }).compile();

    controller = module.get<FittingDimensionController>(FittingDimensionController);
    service = module.get<FittingDimensionService>(FittingDimensionService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("service should be defined", () => {
    expect(service).toBeDefined();
  });
});
