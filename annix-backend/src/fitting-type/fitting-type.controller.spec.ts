import { Test, TestingModule } from '@nestjs/testing';
import { FittingTypeController } from './fitting-type.controller';
import { FittingTypeService } from './fitting-type.service';
import { FittingType } from './entities/fitting-type.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('FittingTypeController', () => {
  let controller: FittingTypeController;
  let service: FittingTypeService;

  const mockFittingTypeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockFittingTypeService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingTypeController],
      providers: [
        { provide: FittingTypeService, useValue: mockFittingTypeService },
        {
          provide: getRepositoryToken(FittingType),
          useValue: mockFittingTypeRepo,
        },
      ],
    }).compile();

    controller = module.get<FittingTypeController>(FittingTypeController);
    service = module.get<FittingTypeService>(FittingTypeService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
