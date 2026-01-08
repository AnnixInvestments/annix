import { Test, TestingModule } from '@nestjs/testing';
import { BendDimensionController } from './bend-dimension.controller';
import { BendDimensionService } from './bend-dimension.service';
import { NbNpsLookup } from '../nb-nps-lookup/entities/nb-nps-lookup.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('BendDimensionController', () => {
  let controller: BendDimensionController;
  let service: BendDimensionService;

  const mockLookupRepo = {
    findOne: jest.fn(),
  };

  const mockBendDimensionService = {
    calculate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BendDimensionController],
      providers: [
        { provide: BendDimensionService, useValue: mockBendDimensionService },
        { provide: getRepositoryToken(NbNpsLookup), useValue: mockLookupRepo },
      ],
    }).compile();

    controller = module.get<BendDimensionController>(BendDimensionController);
    service = module.get<BendDimensionService>(BendDimensionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
