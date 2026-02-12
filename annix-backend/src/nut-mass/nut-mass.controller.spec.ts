import { Test, TestingModule } from '@nestjs/testing';
import { NutMassController } from './nut-mass.controller';
import { NutMassService } from './nut-mass.service';

describe('NutMassController', () => {
  let controller: NutMassController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NutMassController],
      providers: [NutMassService],
    }).compile();

    controller = module.get<NutMassController>(NutMassController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
