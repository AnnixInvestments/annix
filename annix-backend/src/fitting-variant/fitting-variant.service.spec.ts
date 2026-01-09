import { Test, TestingModule } from '@nestjs/testing';
import { FittingVariantService } from './fitting-variant.service';
import { NotFoundException } from '@nestjs/common';
import { FittingVariant } from './entities/fitting-variant.entity';
import { Fitting } from '../fitting/entities/fitting.entity';
import { FittingBore } from '../fitting-bore/entities/fitting-bore.entity';
import { FittingDimension } from '../fitting-dimension/entities/fitting-dimension.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('FittingVariantService', () => {
  let service: FittingVariantService;

  const mockVariantRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockFittingRepo = {
    findOne: jest.fn(),
  };

  const mockBoreRepo = {
    create: jest.fn(),
  };

  const mockDimensionRepo = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FittingVariantService,
        {
          provide: getRepositoryToken(FittingVariant),
          useValue: mockVariantRepo,
        },
        { provide: getRepositoryToken(Fitting), useValue: mockFittingRepo },
        { provide: getRepositoryToken(FittingBore), useValue: mockBoreRepo },
        {
          provide: getRepositoryToken(FittingDimension),
          useValue: mockDimensionRepo,
        },
      ],
    }).compile();

    service = module.get<FittingVariantService>(FittingVariantService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return array of fitting variants', async () => {
      const result = [{ id: 1 }] as FittingVariant[];
      mockVariantRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockVariantRepo.find).toHaveBeenCalledWith({
        relations: ['fitting', 'bores', 'dimensions'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a fitting variant by id', async () => {
      const result = { id: 1 } as FittingVariant;
      mockVariantRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockVariantRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['fitting', 'bores', 'dimensions'],
      });
    });

    it('should throw NotFoundException if fitting variant not found', async () => {
      mockVariantRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a fitting variant', async () => {
      const entity = { id: 1 } as FittingVariant;
      mockVariantRepo.findOne.mockResolvedValue(entity);
      mockVariantRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockVariantRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
