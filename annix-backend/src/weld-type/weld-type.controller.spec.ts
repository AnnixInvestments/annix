import { Test, TestingModule } from '@nestjs/testing';
import { WeldTypeController } from './weld-type.controller';
import { WeldTypeService } from './weld-type.service';

describe('WeldTypeController', () => {
  let controller: WeldTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeldTypeController],
      providers: [WeldTypeService],
    }).compile();

    controller = module.get<WeldTypeController>(WeldTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
