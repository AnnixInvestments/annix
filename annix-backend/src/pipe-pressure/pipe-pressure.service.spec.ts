import { Test, TestingModule } from '@nestjs/testing';
import { PipePressureService } from './pipe-pressure.service';

describe('PipePressureService', () => {
  let service: PipePressureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PipePressureService],
    }).compile();

    service = module.get<PipePressureService>(PipePressureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
