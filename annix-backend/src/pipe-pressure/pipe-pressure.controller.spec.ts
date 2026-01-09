import { Test, TestingModule } from '@nestjs/testing';
import { PipePressureController } from './pipe-pressure.controller';
import { PipePressureService } from './pipe-pressure.service';
import { PipePressure } from './entities/pipe-pressure.entity';
import { PipeDimension } from '../pipe-dimension/entities/pipe-dimension.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('PipePressureController', () => {
  let controller: PipePressureController;
  let service: PipePressureService;

  const mockPressureRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  const mockDimensionRepo = {
    findOne: jest.fn(),
  };

  const mockPipePressureService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipePressureController],
      providers: [
        { provide: PipePressureService, useValue: mockPipePressureService },
        {
          provide: getRepositoryToken(PipePressure),
          useValue: mockPressureRepo,
        },
        {
          provide: getRepositoryToken(PipeDimension),
          useValue: mockDimensionRepo,
        },
      ],
    }).compile();

    controller = module.get<PipePressureController>(PipePressureController);
    service = module.get<PipePressureService>(PipePressureService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
