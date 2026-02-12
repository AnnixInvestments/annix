import { Test, TestingModule } from '@nestjs/testing';
import { FittingBoreController } from './fitting-bore.controller';
import { FittingBoreService } from './fitting-bore.service';

describe('FittingBoreController', () => {
  let controller: FittingBoreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingBoreController],
      providers: [FittingBoreService],
    }).compile();

    controller = module.get<FittingBoreController>(FittingBoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
