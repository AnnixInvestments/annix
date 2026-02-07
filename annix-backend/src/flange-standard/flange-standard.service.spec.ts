import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FlangeStandard } from "./entities/flange-standard.entity";
import { FlangeStandardService } from "./flange-standard.service";

describe("FlangeStandardService", () => {
  let service: FlangeStandardService;

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
        FlangeStandardService,
        { provide: getRepositoryToken(FlangeStandard), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<FlangeStandardService>(FlangeStandardService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
