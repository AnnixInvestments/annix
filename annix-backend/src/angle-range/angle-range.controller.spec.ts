import { Test, TestingModule } from "@nestjs/testing";
import { AngleRangeController } from "./angle-range.controller";
import { AngleRangeRepository } from "./angle-range.repository";
import { AngleRangeService } from "./angle-range.service";

describe("AngleRangeController", () => {
  let controller: AngleRangeController;
  let service: AngleRangeService;

  const mockRangeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    remove: jest.fn(),
  };

  const mockAngleRangeService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AngleRangeController],
      providers: [
        { provide: AngleRangeService, useValue: mockAngleRangeService },
        { provide: AngleRangeRepository, useValue: mockRangeRepo },
      ],
    }).compile();

    controller = module.get<AngleRangeController>(AngleRangeController);
    service = module.get<AngleRangeService>(AngleRangeService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
