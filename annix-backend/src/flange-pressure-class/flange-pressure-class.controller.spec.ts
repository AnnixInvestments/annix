import { Test, TestingModule } from "@nestjs/testing";
import { FlangeStandardRepository } from "../flange-standard/flange-standard.repository";
import { FlangePressureClassController } from "./flange-pressure-class.controller";
import { FlangePressureClassRepository } from "./flange-pressure-class.repository";
import { FlangePressureClassService } from "./flange-pressure-class.service";

describe("FlangePressureClassController", () => {
  let controller: FlangePressureClassController;
  let service: FlangePressureClassService;

  const mockPressureRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    remove: jest.fn(),
  };

  const mockStandardRepo = {
    findOneWhere: jest.fn(),
  };

  const mockFlangePressureClassService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getAllByStandard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlangePressureClassController],
      providers: [
        {
          provide: FlangePressureClassService,
          useValue: mockFlangePressureClassService,
        },
        {
          provide: FlangePressureClassRepository,
          useValue: mockPressureRepo,
        },
        {
          provide: FlangeStandardRepository,
          useValue: mockStandardRepo,
        },
      ],
    }).compile();

    controller = module.get<FlangePressureClassController>(FlangePressureClassController);
    service = module.get<FlangePressureClassService>(FlangePressureClassService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
