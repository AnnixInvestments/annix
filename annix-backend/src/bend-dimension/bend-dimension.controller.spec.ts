import { Test, TestingModule } from '@nestjs/testing';
import { BendDimensionController } from './bend-dimension.controller';

describe('BendDimensionController', () => {
  let controller: BendDimensionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BendDimensionController],
    }).compile();

    controller = module.get<BendDimensionController>(BendDimensionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
