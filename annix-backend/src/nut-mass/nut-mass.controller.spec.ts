import { Test, TestingModule } from '@nestjs/testing';
import { NutMassController } from './nut-mass.controller';
import { NutMassService } from './nut-mass.service';
import { NutMass } from './entities/nut-mass.entity';
import { Bolt } from '../bolt/entities/bolt.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('NutMassController', () => {
  let controller: NutMassController;
  let service: NutMassService;

  const mockNutMassRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockBoltRepo = {
    findOne: jest.fn(),
  };

  const mockNutMassService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NutMassController],
      providers: [
        { provide: NutMassService, useValue: mockNutMassService },
        { provide: getRepositoryToken(NutMass), useValue: mockNutMassRepo },
        { provide: getRepositoryToken(Bolt), useValue: mockBoltRepo },
      ],
    }).compile();

    controller = module.get<NutMassController>(NutMassController);
    service = module.get<NutMassService>(NutMassService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
