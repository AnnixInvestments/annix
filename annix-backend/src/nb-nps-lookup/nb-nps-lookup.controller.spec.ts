import { Test, TestingModule } from '@nestjs/testing';
import { NbNpsLookupController } from './nb-nps-lookup.controller';
import { NbNpsLookupService } from './nb-nps-lookup.service';
import { NbNpsLookup } from './entities/nb-nps-lookup.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('NbNpsLookupController', () => {
  let controller: NbNpsLookupController;
  let service: NbNpsLookupService;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockNbNpsLookupService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NbNpsLookupController],
      providers: [
        { provide: NbNpsLookupService, useValue: mockNbNpsLookupService },
        { provide: getRepositoryToken(NbNpsLookup), useValue: mockRepo },
      ],
    }).compile();

    controller = module.get<NbNpsLookupController>(NbNpsLookupController);
    service = module.get<NbNpsLookupService>(NbNpsLookupService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
