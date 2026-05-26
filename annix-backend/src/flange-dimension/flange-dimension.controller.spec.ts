import { Test, TestingModule } from "@nestjs/testing";
import { FlangeDimensionController } from "./flange-dimension.controller";
import { FlangeDimensionService } from "./flange-dimension.service";

describe("FlangeDimensionController", () => {
  let controller: FlangeDimensionController;
  let service: FlangeDimensionService;

  const mockFlangeDimensionService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlangeDimensionController],
      providers: [
        {
          provide: FlangeDimensionService,
          useValue: mockFlangeDimensionService,
        },
      ],
    }).compile();

    controller = module.get<FlangeDimensionController>(FlangeDimensionController);
    service = module.get<FlangeDimensionService>(FlangeDimensionService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("service should be defined", () => {
    expect(service).toBeDefined();
  });
});
