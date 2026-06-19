import { Test, TestingModule } from "@nestjs/testing";
import { FittingRepository } from "../fitting/fitting.repository";
import { FittingBoreRepository } from "../fitting-bore/fitting-bore.repository";
import { FittingDimensionRepository } from "../fitting-dimension/fitting-dimension.repository";
import { FittingVariantController } from "./fitting-variant.controller";
import { FittingVariantRepository } from "./fitting-variant.repository";
import { FittingVariantService } from "./fitting-variant.service";

describe("FittingVariantController", () => {
  let controller: FittingVariantController;
  let service: FittingVariantService;

  const mockVariantRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    remove: jest.fn(),
  };

  const mockFittingRepo = {
    findOneWhere: jest.fn(),
  };

  const mockBoreRepo = {
    create: jest.fn(),
  };

  const mockDimensionRepo = {
    create: jest.fn(),
  };

  const mockFittingVariantService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingVariantController],
      providers: [
        { provide: FittingVariantService, useValue: mockFittingVariantService },
        {
          provide: FittingVariantRepository,
          useValue: mockVariantRepo,
        },
        { provide: FittingRepository, useValue: mockFittingRepo },
        { provide: FittingBoreRepository, useValue: mockBoreRepo },
        {
          provide: FittingDimensionRepository,
          useValue: mockDimensionRepo,
        },
      ],
    }).compile();

    controller = module.get<FittingVariantController>(FittingVariantController);
    service = module.get<FittingVariantService>(FittingVariantService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
