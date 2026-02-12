import { Test, TestingModule } from '@nestjs/testing';
import { PipeDimensionController } from './pipe-dimension.controller';
import { PipeDimensionService } from './pipe-dimension.service';

describe('PipeDimensionController', () => {
  let controller: PipeDimensionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipeDimensionController],
      providers: [PipeDimensionService],
    }).compile();

    controller = module.get<PipeDimensionController>(PipeDimensionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
