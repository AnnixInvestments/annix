import { Test, TestingModule } from '@nestjs/testing';
import { FlangePressureClassController } from './flange-pressure-class.controller';
import { FlangePressureClassService } from './flange-pressure-class.service';

describe('FlangePressureClassController', () => {
  let controller: FlangePressureClassController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlangePressureClassController],
      providers: [FlangePressureClassService],
    }).compile();

    controller = module.get<FlangePressureClassController>(FlangePressureClassController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
