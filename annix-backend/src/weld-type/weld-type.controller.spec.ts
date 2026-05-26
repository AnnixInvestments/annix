import { Test, TestingModule } from "@nestjs/testing";
import { WeldTypeController } from "./weld-type.controller";
import { WeldTypeService } from "./weld-type.service";

describe("WeldTypeController", () => {
  let controller: WeldTypeController;
  let service: WeldTypeService;

  const mockWeldTypeService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCode: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeldTypeController],
      providers: [{ provide: WeldTypeService, useValue: mockWeldTypeService }],
    }).compile();

    controller = module.get<WeldTypeController>(WeldTypeController);
    service = module.get<WeldTypeService>(WeldTypeService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
