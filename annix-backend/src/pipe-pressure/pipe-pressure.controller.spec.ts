import { Test, TestingModule } from "@nestjs/testing";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { PipePressureController } from "./pipe-pressure.controller";
import { PipePressureRepository } from "./pipe-pressure.repository";
import { PipePressureService } from "./pipe-pressure.service";

describe("PipePressureController", () => {
  let controller: PipePressureController;
  let service: PipePressureService;

  const mockPressureRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    remove: jest.fn(),
  };

  const mockDimensionRepo = {
    findOneWhere: jest.fn(),
  };

  const mockPipePressureService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipePressureController],
      providers: [
        { provide: PipePressureService, useValue: mockPipePressureService },
        {
          provide: PipePressureRepository,
          useValue: mockPressureRepo,
        },
        {
          provide: PipeDimensionRepository,
          useValue: mockDimensionRepo,
        },
      ],
    }).compile();

    controller = module.get<PipePressureController>(PipePressureController);
    service = module.get<PipePressureService>(PipePressureService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
