import { Test, TestingModule } from '@nestjs/testing';
import { PipePressureService } from './pipe-pressure.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PipePressure } from './entities/pipe-pressure.entity';
import { PipeDimension } from '../pipe-dimension/entities/pipe-dimension.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('PipePressureService', () => {
  let service: PipePressureService;

  const mockPressureRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  const mockDimensionRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipePressureService,
        {
          provide: getRepositoryToken(PipePressure),
          useValue: mockPressureRepo,
        },
        {
          provide: getRepositoryToken(PipeDimension),
          useValue: mockDimensionRepo,
        },
      ],
    }).compile();

    service = module.get<PipePressureService>(PipePressureService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return array of pipe pressures', async () => {
      const result = [{ id: 1 }] as PipePressure[];
      mockPressureRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockPressureRepo.find).toHaveBeenCalledWith({
        relations: ['pipeDimension'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a pipe pressure by id', async () => {
      const result = { id: 1 } as PipePressure;
      mockPressureRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockPressureRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['pipeDimension'],
      });
    });

    it('should throw NotFoundException if pipe pressure not found', async () => {
      mockPressureRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a pipe pressure', async () => {
      mockPressureRepo.delete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockPressureRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if pipe pressure not found', async () => {
      mockPressureRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
