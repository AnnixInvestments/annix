import { Test, TestingModule } from '@nestjs/testing';
import { SteelSpecificationService } from './steel-specification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SteelSpecification } from './entities/steel-specification.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('SteelSpecificationService', () => {
  let service: SteelSpecificationService;

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
        SteelSpecificationService,
        { provide: getRepositoryToken(SteelSpecification), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SteelSpecificationService>(SteelSpecificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new steel specification', async () => {
      const dto = { steelSpecName: 'S355' };
      const entity = { id: 1, ...dto } as SteelSpecification;

      mockRepo.findOne.mockResolvedValue(undefined);
      mockRepo.create.mockReturnValue(dto);
      mockRepo.save.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { steelSpecName: dto.steelSpecName },
      });
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException if steel spec already exists', async () => {
      const dto = { steelSpecName: 'S355' };
      mockRepo.findOne.mockResolvedValue({ id: 1, steelSpecName: 'S355' });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { steelSpecName: dto.steelSpecName },
      });
    });
  });

  describe('findAll', () => {
    it('should return array of steel specifications', async () => {
      const result = [{ id: 1, steelSpecName: 'S355' }] as SteelSpecification[];
      mockRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepo.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a steel specification by id', async () => {
      const result = { id: 1, steelSpecName: 'S355' } as SteelSpecification;
      mockRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['fittings', 'pipeDimensions'],
      });
    });

    it('should throw NotFoundException if steel spec not found', async () => {
      mockRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a steel specification', async () => {
      const dto = { steelSpecName: 'S275' };
      const existing = { id: 1, steelSpecName: 'S355' } as SteelSpecification;
      const updated = { id: 1, steelSpecName: 'S275' } as SteelSpecification;

      mockRepo.findOne
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(existing);
      mockRepo.save.mockResolvedValue(updated);

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);

      const result = await service.update(1, dto);
      expect(result).toEqual(updated);
      expect(mockRepo.save).toHaveBeenCalledWith({ ...existing, ...dto });
    });

    it('should throw BadRequestException if duplicate name exists', async () => {
      const dto = { steelSpecName: 'S275' };
      const current = { id: 1, steelSpecName: 'S355' } as SteelSpecification;
      const existing = { id: 2, steelSpecName: 'S275' } as SteelSpecification;

      // Mock findOne for the initial findOne call (to get current spec)
      jest.spyOn(service, 'findOne').mockResolvedValue(current);
      
      // Mock findOne for duplicate check
      mockRepo.findOne.mockResolvedValue(existing);

      await expect(service.update(1, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a steel specification', async () => {
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException if steel spec not found', async () => {
      mockRepo.findOne.mockResolvedValue(undefined);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
