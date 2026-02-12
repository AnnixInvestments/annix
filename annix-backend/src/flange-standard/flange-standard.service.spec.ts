import { Test, TestingModule } from '@nestjs/testing';
import { FlangeStandardService } from './flange-standard.service';

describe('FlangeStandardService', () => {
  let service: FlangeStandardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlangeStandardService],
    }).compile();

    service = module.get<FlangeStandardService>(FlangeStandardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
