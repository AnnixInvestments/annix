import { Test, TestingModule } from '@nestjs/testing';
import { FittingVariantService } from './fitting-variant.service';

describe('FittingVariantService', () => {
  let service: FittingVariantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FittingVariantService],
    }).compile();

    service = module.get<FittingVariantService>(FittingVariantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
