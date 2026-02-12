import { Test, TestingModule } from '@nestjs/testing';
import { FlangeDimensionController } from './flange-dimension.controller';
import { FlangeDimensionService } from './flange-dimension.service';

describe('FlangeDimensionController', () => {
  let controller: FlangeDimensionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlangeDimensionController],
      providers: [FlangeDimensionService],
    }).compile();

    controller = module.get<FlangeDimensionController>(FlangeDimensionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
