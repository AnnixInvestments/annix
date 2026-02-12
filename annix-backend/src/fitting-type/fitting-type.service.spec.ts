import { Test, TestingModule } from '@nestjs/testing';
import { FittingTypeService } from './fitting-type.service';

describe('FittingTypeService', () => {
  let service: FittingTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FittingTypeService],
    }).compile();

    service = module.get<FittingTypeService>(FittingTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
