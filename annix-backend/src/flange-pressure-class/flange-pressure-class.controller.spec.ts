import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FlangeStandard } from "../flange-standard/entities/flange-standard.entity";
import { FlangePressureClass } from "./entities/flange-pressure-class.entity";
import { FlangePressureClassController } from "./flange-pressure-class.controller";
import { FlangePressureClassService } from "./flange-pressure-class.service";

describe("FlangePressureClassController", () => {
  let controller: FlangePressureClassController;
  let service: FlangePressureClassService;

  const mockPressureRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockStandardRepo = {
    findOne: jest.fn(),
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
          provide: getRepositoryToken(FlangePressureClass),
          useValue: mockPressureRepo,
        },
        {
          provide: getRepositoryToken(FlangeStandard),
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
