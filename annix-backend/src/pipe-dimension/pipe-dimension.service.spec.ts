import { Test, TestingModule } from '@nestjs/testing';
import { PipeDimensionService } from './pipe-dimension.service';

describe('PipeDimensionService', () => {
  let service: PipeDimensionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PipeDimensionService],
    }).compile();

    service = module.get<PipeDimensionService>(PipeDimensionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
