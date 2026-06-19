import { Test, TestingModule } from "@nestjs/testing";
import { FittingTypeController } from "./fitting-type.controller";
import { FittingTypeRepository } from "./fitting-type.repository";
import { FittingTypeService } from "./fitting-type.service";

describe("FittingTypeController", () => {
  let controller: FittingTypeController;
  let service: FittingTypeService;

  const mockFittingTypeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    remove: jest.fn(),
  };

  const mockFittingTypeService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingTypeController],
      providers: [
        { provide: FittingTypeService, useValue: mockFittingTypeService },
        {
          provide: FittingTypeRepository,
          useValue: mockFittingTypeRepo,
        },
      ],
    }).compile();

    controller = module.get<FittingTypeController>(FittingTypeController);
    service = module.get<FittingTypeService>(FittingTypeService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
