import { Test, TestingModule } from '@nestjs/testing';
import { FittingBoreController } from './fitting-bore.controller';
import { FittingBoreService } from './fitting-bore.service';
import { FittingBore } from './entities/fitting-bore.entity';
import { FittingVariant } from '../fitting-variant/entities/fitting-variant.entity';
import { NominalOutsideDiameterMm } from '../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('FittingBoreController', () => {
  let controller: FittingBoreController;
  let service: FittingBoreService;

  const mockBoreRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockVariantRepo = {
    findOne: jest.fn(),
  };

  const mockNominalRepo = {
    findOne: jest.fn(),
  };

  const mockFittingBoreService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingBoreController],
      providers: [
        { provide: FittingBoreService, useValue: mockFittingBoreService },
        { provide: getRepositoryToken(FittingBore), useValue: mockBoreRepo },
        { provide: getRepositoryToken(FittingVariant), useValue: mockVariantRepo },
        { provide: getRepositoryToken(NominalOutsideDiameterMm), useValue: mockNominalRepo },
      ],
    }).compile();

    controller = module.get<FittingBoreController>(FittingBoreController);
    service = module.get<FittingBoreService>(FittingBoreService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
