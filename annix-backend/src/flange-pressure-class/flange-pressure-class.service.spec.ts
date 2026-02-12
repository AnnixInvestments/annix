import { Test, TestingModule } from '@nestjs/testing';
import { FlangePressureClassService } from './flange-pressure-class.service';

describe('FlangePressureClassService', () => {
  let service: FlangePressureClassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlangePressureClassService],
    }).compile();

    service = module.get<FlangePressureClassService>(FlangePressureClassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
