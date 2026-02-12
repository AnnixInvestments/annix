import { Test, TestingModule } from '@nestjs/testing';
import { PipePressureController } from './pipe-pressure.controller';
import { PipePressureService } from './pipe-pressure.service';

describe('PipePressureController', () => {
  let controller: PipePressureController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipePressureController],
      providers: [PipePressureService],
    }).compile();

    controller = module.get<PipePressureController>(PipePressureController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
