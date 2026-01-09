import { Test, TestingModule } from '@nestjs/testing';
import { FlangeDimensionController } from './flange-dimension.controller';
import { FlangeDimensionService } from './flange-dimension.service';
import { FlangeDimension } from './entities/flange-dimension.entity';
import { NominalOutsideDiameterMm } from '../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { FlangeStandard } from '../flange-standard/entities/flange-standard.entity';
import { FlangePressureClass } from '../flange-pressure-class/entities/flange-pressure-class.entity';
import { Bolt } from '../bolt/entities/bolt.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('FlangeDimensionController', () => {
  let controller: FlangeDimensionController;
  let service: FlangeDimensionService;

  const mockFlangeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockNominalRepo = {
    findOne: jest.fn(),
  };

  const mockStandardRepo = {
    findOne: jest.fn(),
  };

  const mockPressureRepo = {
    findOne: jest.fn(),
  };

  const mockBoltRepo = {
    findOne: jest.fn(),
  };

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
        {
          provide: getRepositoryToken(FlangeDimension),
          useValue: mockFlangeRepo,
        },
        {
          provide: getRepositoryToken(NominalOutsideDiameterMm),
          useValue: mockNominalRepo,
        },
        {
          provide: getRepositoryToken(FlangeStandard),
          useValue: mockStandardRepo,
        },
        {
          provide: getRepositoryToken(FlangePressureClass),
          useValue: mockPressureRepo,
        },
        { provide: getRepositoryToken(Bolt), useValue: mockBoltRepo },
      ],
    }).compile();

    controller = module.get<FlangeDimensionController>(
      FlangeDimensionController,
    );
    service = module.get<FlangeDimensionService>(FlangeDimensionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
