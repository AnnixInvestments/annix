import { Test, TestingModule } from '@nestjs/testing';
import { BoltController } from './bolt.controller';
import { BoltService } from './bolt.service';
import { Bolt } from './entities/bolt.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('BoltController', () => {
  let controller: BoltController;
  let service: BoltService;

  const mockBoltRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockBoltService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoltController],
      providers: [
        { provide: BoltService, useValue: mockBoltService },
        { provide: getRepositoryToken(Bolt), useValue: mockBoltRepo },
      ],
    }).compile();

    controller = module.get<BoltController>(BoltController);
    service = module.get<BoltService>(BoltService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
