import { Test, TestingModule } from '@nestjs/testing';
import { FlangeDimensionService } from './flange-dimension.service';

describe('FlangeDimensionService', () => {
  let service: FlangeDimensionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlangeDimensionService],
    }).compile();

    service = module.get<FlangeDimensionService>(FlangeDimensionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
