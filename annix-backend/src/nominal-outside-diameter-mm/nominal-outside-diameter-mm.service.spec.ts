import { Test, TestingModule } from '@nestjs/testing';
import { NominalOutsideDiameterMmService } from './nominal-outside-diameter-mm.service';
import { NominalOutsideDiameterMm } from './entities/nominal-outside-diameter-mm.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('NominalOutsideDiameterMmService', () => {
  let service: NominalOutsideDiameterMmService;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NominalOutsideDiameterMmService,
        {
          provide: getRepositoryToken(NominalOutsideDiameterMm),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<NominalOutsideDiameterMmService>(NominalOutsideDiameterMmService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new entity', async () => {
      const dto = { nominal_diameter_mm: 65, outside_diameter_mm: 76.2 };
      const savedEntity: NominalOutsideDiameterMm = { id: 1, ...dto };

      mockRepo.findOneBy.mockResolvedValue(undefined);
      mockRepo.create.mockReturnValue(dto);
      mockRepo.save.mockResolvedValue(savedEntity);

      const result = await service.create(dto);
      expect(result).toEqual(savedEntity);
      expect(mockRepo.findOneBy).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException if duplicate exists', async () => {
      const dto = { nominal_diameter_mm: 65, outside_diameter_mm: 76.2 };
      mockRepo.findOneBy.mockResolvedValue({ id: 1, ...dto });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const entities = [{ id: 1, nominal_diameter_mm: 65, outside_diameter_mm: 76.2 }];
      mockRepo.find.mockResolvedValue(entities);

      const result = await service.findAll();
      expect(result).toEqual(entities);
      expect(mockRepo.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return one entity', async () => {
      const entity = { id: 1, nominal_diameter_mm: 65, outside_diameter_mm: 76.2 };
      mockRepo.findOneBy.mockResolvedValue(entity);

      const result = await service.findOne(1);
      expect(result).toEqual(entity);
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should throw NotFoundException if entity not found', async () => {
      mockRepo.findOneBy.mockResolvedValue(undefined);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an entity', async () => {
      const existing = { id: 1, nominal_diameter_mm: 65, outside_diameter_mm: 76.2 };
      const dto = { nominal_diameter_mm: 70, outside_diameter_mm: 80 };
      const updated = { ...existing, ...dto };

      mockRepo.findOneBy
        .mockResolvedValueOnce(existing) 
        .mockResolvedValueOnce(undefined); 

      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);
      expect(result).toEqual(updated);
      expect(mockRepo.save).toHaveBeenCalledWith(updated);
    });

    it('should throw BadRequestException if duplicate exists', async () => {
      const existing = { id: 1, nominal_diameter_mm: 65, outside_diameter_mm: 76.2 };
      const duplicate = { id: 2, nominal_diameter_mm: 70, outside_diameter_mm: 80 };
      const dto = { nominal_diameter_mm: 70, outside_diameter_mm: 80 };

      mockRepo.findOneBy
        .mockResolvedValueOnce(existing) 
        .mockResolvedValueOnce(duplicate); 

      await expect(service.update(1, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete the entity', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 });
      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if entity not found', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
