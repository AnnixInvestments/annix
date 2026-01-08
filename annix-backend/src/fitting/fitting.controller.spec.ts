import { Test, TestingModule } from '@nestjs/testing';
import { FittingController } from './fitting.controller';
import { FittingService } from './fitting.service';
import { Sabs62FittingDimension } from '../sabs62-fitting-dimension/entities/sabs62-fitting-dimension.entity';
import { Sabs719FittingDimension } from '../sabs719-fitting-dimension/entities/sabs719-fitting-dimension.entity';
import { PipeDimension } from '../pipe-dimension/entities/pipe-dimension.entity';
import { NbNpsLookup } from '../nb-nps-lookup/entities/nb-nps-lookup.entity';
import { FlangeDimension } from '../flange-dimension/entities/flange-dimension.entity';
import { BoltMass } from '../bolt-mass/entities/bolt-mass.entity';
import { NutMass } from '../nut-mass/entities/nut-mass.entity';
import { SteelSpecification } from '../steel-specification/entities/steel-specification.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('FittingController', () => {
  let controller: FittingController;
  let service: FittingService;

  const mockSabs62Repo = {
    createQueryBuilder: jest.fn(),
  };

  const mockSabs719Repo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPipeDimensionRepo = {
    findOne: jest.fn(),
  };

  const mockNbNpsLookupRepo = {
    findOne: jest.fn(),
  };

  const mockFlangeDimensionRepo = {
    findOne: jest.fn(),
  };

  const mockBoltMassRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockNutMassRepo = {
    findOne: jest.fn(),
  };

  const mockSteelSpecRepo = {
    findOne: jest.fn(),
  };

  const mockFittingService = {
    calculateFitting: jest.fn(),
    getFittingDimensions: jest.fn(),
    getAvailableFittingTypes: jest.fn(),
    getAvailableSizes: jest.fn(),
    getAvailableAngleRanges: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingController],
      providers: [
        { provide: FittingService, useValue: mockFittingService },
        { provide: getRepositoryToken(Sabs62FittingDimension), useValue: mockSabs62Repo },
        { provide: getRepositoryToken(Sabs719FittingDimension), useValue: mockSabs719Repo },
        { provide: getRepositoryToken(PipeDimension), useValue: mockPipeDimensionRepo },
        { provide: getRepositoryToken(NbNpsLookup), useValue: mockNbNpsLookupRepo },
        { provide: getRepositoryToken(FlangeDimension), useValue: mockFlangeDimensionRepo },
        { provide: getRepositoryToken(BoltMass), useValue: mockBoltMassRepo },
        { provide: getRepositoryToken(NutMass), useValue: mockNutMassRepo },
        { provide: getRepositoryToken(SteelSpecification), useValue: mockSteelSpecRepo },
      ],
    }).compile();

    controller = module.get<FittingController>(FittingController);
    service = module.get<FittingService>(FittingService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
