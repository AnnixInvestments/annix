import { Test, TestingModule } from "@nestjs/testing";
import { NutMassController } from "./nut-mass.controller";
import { NutMassRepository } from "./nut-mass.repository";
import { NutMassService } from "./nut-mass.service";

describe("NutMassController", () => {
  let controller: NutMassController;
  let service: NutMassService;

  const mockNutMassService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockNutMassRepository: jest.Mocked<NutMassRepository> = {
    findAllWithBolt: jest.fn(),
    findOneWithBolt: jest.fn(),
    findExisting: jest.fn(),
    findByBoltId: jest.fn(),
    findBolt: jest.fn(),
    createNut: jest.fn(),
    saveNut: jest.fn(),
    removeNut: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    typesGrouped: jest.fn(),
    boltDesignationsForType: jest.fn(),
    gradesForTypeAndSize: jest.fn(),
  } as jest.Mocked<NutMassRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NutMassController],
      providers: [
        { provide: NutMassService, useValue: mockNutMassService },
        { provide: NutMassRepository, useValue: mockNutMassRepository },
      ],
    }).compile();

    controller = module.get<NutMassController>(NutMassController);
    service = module.get<NutMassService>(NutMassService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should have service defined", () => {
    expect(service).toBeDefined();
  });
});
