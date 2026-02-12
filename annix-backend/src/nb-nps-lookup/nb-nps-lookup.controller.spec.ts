import { Test, TestingModule } from '@nestjs/testing';
import { NbNpsLookupController } from './nb-nps-lookup.controller';
import { NbNpsLookupService } from './nb-nps-lookup.service';

describe('NbNpsLookupController', () => {
  let controller: NbNpsLookupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NbNpsLookupController],
      providers: [NbNpsLookupService],
    }).compile();

    controller = module.get<NbNpsLookupController>(NbNpsLookupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
