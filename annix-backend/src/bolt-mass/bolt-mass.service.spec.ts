import { Test, TestingModule } from '@nestjs/testing';
import { BoltMassService } from './bolt-mass.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BoltMass } from './entities/bolt-mass.entity';
import { Bolt } from '../bolt/entities/bolt.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('BoltMassService', () => {
  let service: BoltMassService;

  const mockBoltMassRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockBoltRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoltMassService,
        { provide: getRepositoryToken(BoltMass), useValue: mockBoltMassRepo },
        { provide: getRepositoryToken(Bolt), useValue: mockBoltRepo },
      ],
    }).compile();

    service = module.get<BoltMassService>(BoltMassService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new bolt mass', async () => {
      const dto = { boltId: 1, length_mm: 100, mass_kg: 0.5 };
      const bolt = { id: 1 } as Bolt;
      const entity = { id: 1, bolt, ...dto } as BoltMass;

      mockBoltRepo.findOne.mockResolvedValue(bolt);
      mockBoltMassRepo.findOne.mockResolvedValue(undefined);
      mockBoltMassRepo.create.mockReturnValue({ bolt, ...dto });
      mockBoltMassRepo.save.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockBoltRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockBoltMassRepo.findOne).toHaveBeenCalledWith({
        where: { bolt: { id: 1 }, length_mm: 100 },
      });
      expect(mockBoltMassRepo.create).toHaveBeenCalledWith({ bolt, ...dto });
    });

    it('should throw NotFoundException if bolt not found', async () => {
      const dto = { boltId: 1, length_mm: 100, mass_kg: 0.5 };
      mockBoltRepo.findOne.mockResolvedValue(undefined);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if bolt mass already exists', async () => {
      const dto = { boltId: 1, length_mm: 100, mass_kg: 0.5 };
      const bolt = { id: 1 } as Bolt;
      const existing = { id: 2 } as BoltMass;

      mockBoltRepo.findOne.mockResolvedValue(bolt);
      mockBoltMassRepo.findOne.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return array of bolt masses', async () => {
      const result = [{ id: 1 }] as BoltMass[];
      mockBoltMassRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockBoltMassRepo.find).toHaveBeenCalledWith({
        relations: ['bolt'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a bolt mass by id', async () => {
      const result = { id: 1 } as BoltMass;
      mockBoltMassRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockBoltMassRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['bolt'],
      });
    });

    it('should throw NotFoundException if bolt mass not found', async () => {
      mockBoltMassRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a bolt mass', async () => {
      const entity = { id: 1 } as BoltMass;
      mockBoltMassRepo.findOne.mockResolvedValue(entity);
      mockBoltMassRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockBoltMassRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
