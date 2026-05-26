import { Test, TestingModule } from "@nestjs/testing";
import { FlangeStandardRepository } from "./flange-standard.repository";
import { FlangeStandardService } from "./flange-standard.service";

describe("FlangeStandardService", () => {
  let service: FlangeStandardService;

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
      providers: [FlangeStandardService, { provide: FlangeStandardRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<FlangeStandardService>(FlangeStandardService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
