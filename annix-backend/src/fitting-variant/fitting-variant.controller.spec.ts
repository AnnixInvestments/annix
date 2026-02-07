import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Fitting } from "../fitting/entities/fitting.entity";
import { FittingBore } from "../fitting-bore/entities/fitting-bore.entity";
import { FittingDimension } from "../fitting-dimension/entities/fitting-dimension.entity";
import { FittingVariant } from "./entities/fitting-variant.entity";
import { FittingVariantController } from "./fitting-variant.controller";
import { FittingVariantService } from "./fitting-variant.service";

describe("FittingVariantController", () => {
  let controller: FittingVariantController;
  let service: FittingVariantService;

  const mockVariantRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockFittingRepo = {
    findOne: jest.fn(),
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
          provide: getRepositoryToken(FittingVariant),
          useValue: mockVariantRepo,
        },
        { provide: getRepositoryToken(Fitting), useValue: mockFittingRepo },
        { provide: getRepositoryToken(FittingBore), useValue: mockBoreRepo },
        {
          provide: getRepositoryToken(FittingDimension),
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
