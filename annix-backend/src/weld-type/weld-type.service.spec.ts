import { Test, TestingModule } from '@nestjs/testing';
import { WeldTypeService } from './weld-type.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WeldType } from './entities/weld-type.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('WeldTypeService', () => {
  let service: WeldTypeService;

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
        WeldTypeService,
        { provide: getRepositoryToken(WeldType), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<WeldTypeService>(WeldTypeService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new weld type', async () => {
      const dto = { weld_code: 'BW', weld_name: 'Butt Weld', category: 'WELD' };
      const entity = { id: 1, ...dto } as WeldType;

      mockRepo.findOne.mockResolvedValue(undefined);
      mockRepo.create.mockReturnValue(dto);
      mockRepo.save.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { weld_code: dto.weld_code },
      });
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException if weld code already exists', async () => {
      const dto = { weld_code: 'BW', weld_name: 'Butt Weld', category: 'WELD' };
      mockRepo.findOne.mockResolvedValue({ id: 1, weld_code: 'BW' });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { weld_code: dto.weld_code },
      });
    });
  });

  describe('findAll', () => {
    it('should return array of weld types', async () => {
      const result = [{ id: 1, weld_code: 'BW' }] as WeldType[];
      mockRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepo.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a weld type by id', async () => {
      const result = { id: 1, weld_code: 'BW' } as WeldType;
      mockRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if weld type not found', async () => {
      mockRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should return a weld type by code', async () => {
      const result = { id: 1, weld_code: 'BW' } as WeldType;
      mockRepo.findOne.mockResolvedValue(result);

      expect(await service.findByCode('BW')).toEqual(result);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { weld_code: 'BW' },
      });
    });

    it('should throw NotFoundException if weld type not found by code', async () => {
      mockRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findByCode('UNKNOWN')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a weld type', async () => {
      const entity = { id: 1, weld_code: 'BW' } as WeldType;
      mockRepo.findOne.mockResolvedValue(entity);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
