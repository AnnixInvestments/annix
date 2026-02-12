import { Test, TestingModule } from '@nestjs/testing';
import { SteelSpecificationService } from './steel-specification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SteelSpecification } from './entities/steel-specification.entity';

describe('SteelSpecificationService', () => {
  let service: SteelSpecificationService;

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
        SteelSpecificationService,
        { provide: 'SteelSpecificationRepository', useValue: mockRepo },
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

      mockRepo.findOneBy.mockResolvedValue(undefined); 
      mockRepo.create.mockReturnValue(dto);
      mockRepo.save.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ steelSpecName: dto.steelSpecName });
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException if steel spec already exists', async () => {
      const dto = { steelSpecName: 'S355' };
      mockRepo.findOneBy.mockResolvedValue({ id: 1, steelSpecName: 'S355' });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ steelSpecName: dto.steelSpecName });
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
      mockRepo.findOneBy.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should throw NotFoundException if steel spec not found', async () => {
      mockRepo.findOneBy.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a steel specification', async () => {
      const dto = { steelSpecName: 'S275' };
      const existing = { id: 1, steelSpecName: 'S355' } as SteelSpecification;
      const updated = { id: 1, steelSpecName: 'S275' } as SteelSpecification;

      mockRepo.findOneBy
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

      mockRepo.findOneBy.mockImplementation(({ id, steelSpecName }) => {
        if (id === 1) return Promise.resolve(current);         
        if (steelSpecName === 'S275') return Promise.resolve(existing); 
        return Promise.resolve(null);
      });

      mockRepo.save.mockResolvedValue({ ...current, ...dto }); 

      await expect(service.update(1, dto)).rejects.toThrow(BadRequestException);
    });

  });

  describe('remove', () => {
    it('should delete a steel specification', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if steel spec not found', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
