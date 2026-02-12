import { Test, TestingModule } from '@nestjs/testing';
import { BoltMassController } from './bolt-mass.controller';
import { BoltMassService } from './bolt-mass.service';

describe('BoltMassController', () => {
  let controller: BoltMassController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoltMassController],
      providers: [BoltMassService],
    }).compile();

    controller = module.get<BoltMassController>(BoltMassController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
