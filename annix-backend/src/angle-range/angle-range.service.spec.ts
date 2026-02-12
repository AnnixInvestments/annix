import { Test, TestingModule } from '@nestjs/testing';
import { AngleRangeService } from './angle-range.service';

describe('AngleRangeService', () => {
  let service: AngleRangeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AngleRangeService],
    }).compile();

    service = module.get<AngleRangeService>(AngleRangeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
