import { Test, TestingModule } from '@nestjs/testing';
import { FlangeStandardController } from './flange-standard.controller';
import { FlangeStandardService } from './flange-standard.service';

describe('FlangeStandardController', () => {
  let controller: FlangeStandardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlangeStandardController],
      providers: [FlangeStandardService],
    }).compile();

    controller = module.get<FlangeStandardController>(FlangeStandardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
