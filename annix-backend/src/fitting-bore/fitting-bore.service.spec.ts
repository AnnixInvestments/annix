import { Test, TestingModule } from '@nestjs/testing';
import { FittingBoreService } from './fitting-bore.service';

describe('FittingBoreService', () => {
  let service: FittingBoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FittingBoreService],
    }).compile();

    service = module.get<FittingBoreService>(FittingBoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
