import { Test, TestingModule } from '@nestjs/testing';
import { NutMassService } from './nut-mass.service';

describe('NutMassService', () => {
  let service: NutMassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NutMassService],
    }).compile();

    service = module.get<NutMassService>(NutMassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
