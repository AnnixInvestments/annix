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
    findOne: jest.fn(),
    remove: jest.fn(),
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

    service = module.get<NominalOutsideDiameterMmService>(
      NominalOutsideDiameterMmService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new entity', async () => {
      const dto = { nominal_diameter_mm: 65, outside_diameter_mm: 76.2 };
      const savedEntity: NominalOutsideDiameterMm = {
        id: 1,
        nominal_diameter_mm: dto.nominal_diameter_mm,
        outside_diameter_mm: dto.outside_diameter_mm,
        pipeDimensions: [],
        fittingBores: [],
        flangeDimensions: [],
      };

      mockRepo.findOne.mockResolvedValue(undefined);
      mockRepo.create.mockReturnValue(dto);
      mockRepo.save.mockResolvedValue(savedEntity);

      const result = await service.create(dto);
      expect(result).toEqual(savedEntity);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: {
          nominal_diameter_mm: dto.nominal_diameter_mm,
          outside_diameter_mm: dto.outside_diameter_mm,
        },
      });
      expect(mockRepo.save).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException if duplicate exists', async () => {
      const dto = { nominal_diameter_mm: 65, outside_diameter_mm: 76.2 };
      mockRepo.findOne.mockResolvedValue({ id: 1, ...dto });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const entities = [
        { id: 1, nominal_diameter_mm: 65, outside_diameter_mm: 76.2 },
      ];
      mockRepo.find.mockResolvedValue(entities);

      const result = await service.findAll();
      expect(result).toEqual(entities);
      expect(mockRepo.find).toHaveBeenCalledWith({
        relations: ['pipeDimensions', 'fittingBores'],
      });
    });
  });

  describe('findOne', () => {
    it('should return one entity', async () => {
      const entity = {
        id: 1,
        nominal_diameter_mm: 65,
        outside_diameter_mm: 76.2,
      };
      mockRepo.findOne.mockResolvedValue(entity);

      const result = await service.findOne(1);
      expect(result).toEqual(entity);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['pipeDimensions', 'fittingBores'],
      });
    });

    it('should throw NotFoundException if entity not found', async () => {
      mockRepo.findOne.mockResolvedValue(undefined);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an entity', async () => {
      const existing = {
        id: 1,
        nominal_diameter_mm: 65,
        outside_diameter_mm: 76.2,
      };
      const dto = { nominal_diameter_mm: 70, outside_diameter_mm: 80 };
      const updated = { ...existing, ...dto };

      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);
      expect(result).toEqual(updated);
      expect(mockRepo.save).toHaveBeenCalledWith({ ...existing, ...dto });
    });
  });

  describe('remove', () => {
    it('should delete an entity', async () => {
      const entity = {
        id: 1,
        nominal_diameter_mm: 65,
        outside_diameter_mm: 76.2,
      } as NominalOutsideDiameterMm;
      mockRepo.findOne.mockResolvedValue(entity);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
