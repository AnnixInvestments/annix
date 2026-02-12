import { Test, TestingModule } from '@nestjs/testing';
import { FittingVariantController } from './fitting-variant.controller';
import { FittingVariantService } from './fitting-variant.service';

describe('FittingVariantController', () => {
  let controller: FittingVariantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingVariantController],
      providers: [FittingVariantService],
    }).compile();

    controller = module.get<FittingVariantController>(FittingVariantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
