import { Test, TestingModule } from '@nestjs/testing';
import { NbNpsLookupService } from './nb-nps-lookup.service';

describe('NbNpsLookupService', () => {
  let service: NbNpsLookupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NbNpsLookupService],
    }).compile();

    service = module.get<NbNpsLookupService>(NbNpsLookupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
