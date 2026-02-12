import { Test, TestingModule } from '@nestjs/testing';
import { AngleRangeController } from './angle-range.controller';
import { AngleRangeService } from './angle-range.service';

describe('AngleRangeController', () => {
  let controller: AngleRangeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AngleRangeController],
      providers: [AngleRangeService],
    }).compile();

    controller = module.get<AngleRangeController>(AngleRangeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
