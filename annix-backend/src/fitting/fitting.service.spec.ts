import { Test, TestingModule } from '@nestjs/testing';
import { FittingService } from './fitting.service';

describe('FittingService', () => {
  let service: FittingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FittingService],
    }).compile();

    service = module.get<FittingService>(FittingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
