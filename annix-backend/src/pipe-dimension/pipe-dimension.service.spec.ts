import { Test, TestingModule } from '@nestjs/testing';
import { PipeDimensionService } from './pipe-dimension.service';
import { NotFoundException } from '@nestjs/common';
import { PipeDimension } from './entities/pipe-dimension.entity';
import { NominalOutsideDiameterMm } from '../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { SteelSpecification } from '../steel-specification/entities/steel-specification.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('PipeDimensionService', () => {
  let service: PipeDimensionService;

  const mockPipeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockNominalRepo = {
    findOne: jest.fn(),
  };

  const mockSteelRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipeDimensionService,
        { provide: getRepositoryToken(PipeDimension), useValue: mockPipeRepo },
        { provide: getRepositoryToken(NominalOutsideDiameterMm), useValue: mockNominalRepo },
        { provide: getRepositoryToken(SteelSpecification), useValue: mockSteelRepo },
      ],
    }).compile();

    service = module.get<PipeDimensionService>(PipeDimensionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return array of pipe dimensions', async () => {
      const result = [{ id: 1 }] as PipeDimension[];
      mockPipeRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockPipeRepo.find).toHaveBeenCalledWith({
        relations: ['nominalOutsideDiameter', 'steelSpecification', 'pressures'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a pipe dimension by id', async () => {
      const result = { id: 1 } as PipeDimension;
      mockPipeRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockPipeRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['nominalOutsideDiameter', 'steelSpecification', 'pressures'],
      });
    });

    it('should throw NotFoundException if pipe dimension not found', async () => {
      mockPipeRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a pipe dimension', async () => {
      const entity = { id: 1 } as PipeDimension;
      mockPipeRepo.findOne.mockResolvedValue(entity);
      mockPipeRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockPipeRepo.remove).toHaveBeenCalledWith(entity);
    });
  });

  describe('findAllBySpecAndNominal', () => {
    it('should return pipe dimensions by spec and nominal', async () => {
      const result = [{ id: 1 }] as PipeDimension[];
      mockPipeRepo.find.mockResolvedValue(result);

      expect(await service.findAllBySpecAndNominal(1, 1)).toEqual(result);
      expect(mockPipeRepo.find).toHaveBeenCalledWith({
        where: {
          steelSpecification: { id: 1 },
          nominalOutsideDiameter: { id: 1 },
        },
        relations: ['nominalOutsideDiameter', 'steelSpecification', 'pressures'],
        order: {
          wall_thickness_mm: 'ASC',
        },
      });
    });
  });
});
