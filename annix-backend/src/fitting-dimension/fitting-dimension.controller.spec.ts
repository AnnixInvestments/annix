import { Test, TestingModule } from '@nestjs/testing';
import { FittingDimensionController } from './fitting-dimension.controller';
import { FittingDimensionService } from './fitting-dimension.service';

describe('FittingDimensionController', () => {
  let controller: FittingDimensionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingDimensionController],
      providers: [FittingDimensionService],
    }).compile();

    controller = module.get<FittingDimensionController>(FittingDimensionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
