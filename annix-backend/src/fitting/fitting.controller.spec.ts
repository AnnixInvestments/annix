import { Test, TestingModule } from '@nestjs/testing';
import { FittingController } from './fitting.controller';
import { FittingService } from './fitting.service';

describe('FittingController', () => {
  let controller: FittingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingController],
      providers: [FittingService],
    }).compile();

    controller = module.get<FittingController>(FittingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
