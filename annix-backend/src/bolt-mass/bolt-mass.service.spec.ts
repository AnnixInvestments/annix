import { Test, TestingModule } from '@nestjs/testing';
import { BoltMassService } from './bolt-mass.service';

describe('BoltMassService', () => {
  let service: BoltMassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BoltMassService],
    }).compile();

    service = module.get<BoltMassService>(BoltMassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
