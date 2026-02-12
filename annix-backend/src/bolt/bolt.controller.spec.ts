import { Test, TestingModule } from '@nestjs/testing';
import { BoltController } from './bolt.controller';
import { BoltService } from './bolt.service';

describe('BoltController', () => {
  let controller: BoltController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoltController],
      providers: [BoltService],
    }).compile();

    controller = module.get<BoltController>(BoltController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
