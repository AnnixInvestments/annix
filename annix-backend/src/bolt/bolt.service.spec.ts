import { Test, TestingModule } from '@nestjs/testing';
import { BoltService } from './bolt.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Bolt } from './entities/bolt.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('BoltService', () => {
  let service: BoltService;

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
        BoltService,
        { provide: getRepositoryToken(Bolt), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<BoltService>(BoltService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new bolt', async () => {
      const dto = { designation: 'M20' };
      const entity = { id: 1, ...dto } as Bolt;

      mockRepo.findOne.mockResolvedValue(undefined);
      mockRepo.create.mockReturnValue(dto);
      mockRepo.save.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { designation: dto.designation },
      });
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException if bolt already exists', async () => {
      const dto = { designation: 'M20' };
      mockRepo.findOne.mockResolvedValue({ id: 1, designation: 'M20' });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { designation: dto.designation },
      });
    });
  });

  describe('findAll', () => {
    it('should return array of bolts', async () => {
      const result = [{ id: 1, designation: 'M20' }] as Bolt[];
      mockRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepo.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a bolt by id', async () => {
      const result = { id: 1, designation: 'M20' } as Bolt;
      mockRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if bolt not found', async () => {
      mockRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a bolt', async () => {
      const dto = { designation: 'M24' };
      const existing = { id: 1, designation: 'M20' } as Bolt;
      const updated = { id: 1, designation: 'M24' } as Bolt;

      mockRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(undefined);
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);
      expect(result).toEqual(updated);
      expect(mockRepo.save).toHaveBeenCalledWith({ ...existing, ...dto });
    });

    it('should throw BadRequestException if duplicate designation exists', async () => {
      const dto = { designation: 'M24' };
      const current = { id: 1, designation: 'M20' } as Bolt;
      const existing = { id: 2, designation: 'M24' } as Bolt;

      mockRepo.findOne.mockImplementation(({ where }) => {
        if (where.id === 1) return Promise.resolve(current);
        if (where.designation === 'M24') return Promise.resolve(existing);
        return Promise.resolve(null);
      });

      await expect(service.update(1, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a bolt', async () => {
      const entity = { id: 1, designation: 'M20' } as Bolt;
      mockRepo.findOne.mockResolvedValue(entity);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
