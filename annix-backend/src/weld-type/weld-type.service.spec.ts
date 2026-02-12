import { Test, TestingModule } from '@nestjs/testing';
import { WeldTypeService } from './weld-type.service';

describe('WeldTypeService', () => {
  let service: WeldTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeldTypeService],
    }).compile();

    service = module.get<WeldTypeService>(WeldTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
