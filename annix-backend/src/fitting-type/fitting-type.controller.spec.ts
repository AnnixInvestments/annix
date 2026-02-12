import { Test, TestingModule } from '@nestjs/testing';
import { FittingTypeController } from './fitting-type.controller';
import { FittingTypeService } from './fitting-type.service';

describe('FittingTypeController', () => {
  let controller: FittingTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FittingTypeController],
      providers: [FittingTypeService],
    }).compile();

    controller = module.get<FittingTypeController>(FittingTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
