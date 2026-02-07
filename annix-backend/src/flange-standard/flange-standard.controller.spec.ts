import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FlangeStandard } from "./entities/flange-standard.entity";
import { FlangeStandardController } from "./flange-standard.controller";
import { FlangeStandardService } from "./flange-standard.service";

describe("FlangeStandardController", () => {
  let controller: FlangeStandardController;
  let service: FlangeStandardService;

  const mockStandardRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockFlangeStandardService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlangeStandardController],
      providers: [
        { provide: FlangeStandardService, useValue: mockFlangeStandardService },
        {
          provide: getRepositoryToken(FlangeStandard),
          useValue: mockStandardRepo,
        },
      ],
    }).compile();

    controller = module.get<FlangeStandardController>(FlangeStandardController);
    service = module.get<FlangeStandardService>(FlangeStandardService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
