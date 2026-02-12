import { Test, TestingModule } from '@nestjs/testing';
import { BendDimensionService } from './bend-dimension.service';

describe('BendDimensionService', () => {
  let service: BendDimensionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BendDimensionService],
    }).compile();

    service = module.get<BendDimensionService>(BendDimensionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
