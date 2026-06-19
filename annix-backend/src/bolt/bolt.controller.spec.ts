import { Test, TestingModule } from "@nestjs/testing";
import { BoltController } from "./bolt.controller";
import { BoltRepository } from "./bolt.repository";
import { BoltService } from "./bolt.service";

describe("BoltController", () => {
  let controller: BoltController;
  let service: BoltService;

  const mockBoltRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    remove: jest.fn(),
  };

  const mockBoltService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoltController],
      providers: [
        { provide: BoltService, useValue: mockBoltService },
        { provide: BoltRepository, useValue: mockBoltRepo },
      ],
    }).compile();

    controller = module.get<BoltController>(BoltController);
    service = module.get<BoltService>(BoltService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
