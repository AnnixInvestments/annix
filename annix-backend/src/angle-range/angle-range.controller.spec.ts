import { Test, TestingModule } from '@nestjs/testing';
import { AngleRangeController } from './angle-range.controller';
import { AngleRangeService } from './angle-range.service';
import { AngleRange } from './entities/angle-range.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('AngleRangeController', () => {
  let controller: AngleRangeController;
  let service: AngleRangeService;

  const mockRangeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockAngleRangeService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AngleRangeController],
      providers: [
        { provide: AngleRangeService, useValue: mockAngleRangeService },
        { provide: getRepositoryToken(AngleRange), useValue: mockRangeRepo },
      ],
    }).compile();

    controller = module.get<AngleRangeController>(AngleRangeController);
    service = module.get<AngleRangeService>(AngleRangeService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
