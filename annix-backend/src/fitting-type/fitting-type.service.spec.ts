import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FittingType } from "./entities/fitting-type.entity";
import { FittingTypeService } from "./fitting-type.service";

describe("FittingTypeService", () => {
  let service: FittingTypeService;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FittingTypeService,
        { provide: getRepositoryToken(FittingType), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<FittingTypeService>(FittingTypeService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
