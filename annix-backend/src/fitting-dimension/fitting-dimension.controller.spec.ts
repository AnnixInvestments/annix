import { Test, TestingModule } from '@nestjs/testing';
import { FittingDimensionController } from './fitting-dimension.controller';
import { FittingDimensionService } from './fitting-dimension.service';
import { FittingDimension } from './entities/fitting-dimension.entity';
import { FittingVariant } from '../fitting-variant/entities/fitting-variant.entity';
import { AngleRange } from '../angle-range/entities/angle-range.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('FittingDimensionController', () => {
  let controller: FittingDimensionController;
  let service: FittingDimensionService;

  const mockDimRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockVariantRepo = {
    findOne: jest.fn(),
  };

  const mockAngleRangeRepo = {
    findOne: jest.fn(),
  };

  const mockFittingDimensionService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingDimensionController],
      providers: [
        { provide: FittingDimensionService, useValue: mockFittingDimensionService },
        { provide: getRepositoryToken(FittingDimension), useValue: mockDimRepo },
        { provide: getRepositoryToken(FittingVariant), useValue: mockVariantRepo },
        { provide: getRepositoryToken(AngleRange), useValue: mockAngleRangeRepo },
      ],
    }).compile();

    controller = module.get<FittingDimensionController>(
      FittingDimensionController,
    );
    service = module.get<FittingDimensionService>(FittingDimensionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
