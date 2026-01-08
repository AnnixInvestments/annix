import { Test, TestingModule } from '@nestjs/testing';
import { BoltMassController } from './bolt-mass.controller';
import { BoltMassService } from './bolt-mass.service';
import { BoltMass } from './entities/bolt-mass.entity';
import { Bolt } from '../bolt/entities/bolt.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('BoltMassController', () => {
  let controller: BoltMassController;
  let service: BoltMassService;

  const mockBoltMassRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockBoltRepo = {
    findOne: jest.fn(),
  };

  const mockBoltMassService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoltMassController],
      providers: [
        { provide: BoltMassService, useValue: mockBoltMassService },
        { provide: getRepositoryToken(BoltMass), useValue: mockBoltMassRepo },
        { provide: getRepositoryToken(Bolt), useValue: mockBoltRepo },
      ],
    }).compile();

    controller = module.get<BoltMassController>(BoltMassController);
    service = module.get<BoltMassService>(BoltMassService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
