import { Test, TestingModule } from '@nestjs/testing';
import { FittingDimensionService } from './fitting-dimension.service';

describe('FittingDimensionService', () => {
  let service: FittingDimensionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FittingDimensionService],
    }).compile();

    service = module.get<FittingDimensionService>(FittingDimensionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
