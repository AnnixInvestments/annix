import { Test, TestingModule } from "@nestjs/testing";
import { BoltRepository } from "../bolt/bolt.repository";
import { BoltMassController } from "./bolt-mass.controller";
import { BoltMassRepository } from "./bolt-mass.repository";
import { BoltMassService } from "./bolt-mass.service";

describe("BoltMassController", () => {
  let controller: BoltMassController;
  let service: BoltMassService;

  const mockBoltMassRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    remove: jest.fn(),
  };

  const mockBoltRepo = {
    findOneWhere: jest.fn(),
  };

  const mockBoltMassService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoltMassController],
      providers: [
        { provide: BoltMassService, useValue: mockBoltMassService },
        { provide: BoltMassRepository, useValue: mockBoltMassRepo },
        { provide: BoltRepository, useValue: mockBoltRepo },
      ],
    }).compile();

    controller = module.get<BoltMassController>(BoltMassController);
    service = module.get<BoltMassService>(BoltMassService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
