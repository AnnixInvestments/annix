import { Test, TestingModule } from "@nestjs/testing";
import { FittingVariantRepository } from "../fitting-variant/fitting-variant.repository";
import { NominalOutsideDiameterMmRepository } from "../nominal-outside-diameter-mm/nominal-outside-diameter-mm.repository";
import { FittingBoreController } from "./fitting-bore.controller";
import { FittingBoreRepository } from "./fitting-bore.repository";
import { FittingBoreService } from "./fitting-bore.service";

describe("FittingBoreController", () => {
  let controller: FittingBoreController;
  let service: FittingBoreService;

  const mockBoreRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    remove: jest.fn(),
  };

  const mockVariantRepo = {
    findOneWhere: jest.fn(),
  };

  const mockNominalRepo = {
    findOneWhere: jest.fn(),
  };

  const mockFittingBoreService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingBoreController],
      providers: [
        { provide: FittingBoreService, useValue: mockFittingBoreService },
        { provide: FittingBoreRepository, useValue: mockBoreRepo },
        {
          provide: FittingVariantRepository,
          useValue: mockVariantRepo,
        },
        {
          provide: NominalOutsideDiameterMmRepository,
          useValue: mockNominalRepo,
        },
      ],
    }).compile();

    controller = module.get<FittingBoreController>(FittingBoreController);
    service = module.get<FittingBoreService>(FittingBoreService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
