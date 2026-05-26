import { Test, TestingModule } from "@nestjs/testing";
import { FittingTypeRepository } from "./fitting-type.repository";
import { FittingTypeService } from "./fitting-type.service";

describe("FittingTypeService", () => {
  let service: FittingTypeService;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FittingTypeService, { provide: FittingTypeRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<FittingTypeService>(FittingTypeService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
