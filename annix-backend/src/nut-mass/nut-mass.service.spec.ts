import { Test, TestingModule } from '@nestjs/testing';
import { NutMassService } from './nut-mass.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NutMass } from './entities/nut-mass.entity';
import { Bolt } from '../bolt/entities/bolt.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('NutMassService', () => {
  let service: NutMassService;

  const mockNutMassRepo = {
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
        NutMassService,
        { provide: getRepositoryToken(NutMass), useValue: mockNutMassRepo },
        { provide: getRepositoryToken(Bolt), useValue: mockBoltRepo },
      ],
    }).compile();

    service = module.get<NutMassService>(NutMassService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new nut mass', async () => {
      const dto = { boltId: 1, mass_kg: 0.1 };
      const bolt = { id: 1 } as Bolt;
      const entity = { id: 1, bolt, mass_kg: 0.1 } as NutMass;

      mockBoltRepo.findOne.mockResolvedValue(bolt);
      mockNutMassRepo.findOne.mockResolvedValue(undefined);
      mockNutMassRepo.create.mockReturnValue({ bolt, mass_kg: 0.1 });
      mockNutMassRepo.save.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockBoltRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockNutMassRepo.findOne).toHaveBeenCalledWith({
        where: { bolt: { id: 1 }, mass_kg: 0.1 },
      });
      expect(mockNutMassRepo.create).toHaveBeenCalledWith({
        bolt,
        mass_kg: 0.1,
      });
    });

    it('should throw NotFoundException if bolt not found', async () => {
      const dto = { boltId: 1, mass_kg: 0.1 };
      mockBoltRepo.findOne.mockResolvedValue(undefined);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if nut mass already exists', async () => {
      const dto = { boltId: 1, mass_kg: 0.1 };
      const bolt = { id: 1 } as Bolt;
      const existing = { id: 2 } as NutMass;

      mockBoltRepo.findOne.mockResolvedValue(bolt);
      mockNutMassRepo.findOne.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return array of nut masses', async () => {
      const result = [{ id: 1 }] as NutMass[];
      mockNutMassRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockNutMassRepo.find).toHaveBeenCalledWith({
        relations: ['bolt'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a nut mass by id', async () => {
      const result = { id: 1 } as NutMass;
      mockNutMassRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockNutMassRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['bolt'],
      });
    });

    it('should throw NotFoundException if nut mass not found', async () => {
      mockNutMassRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a nut mass', async () => {
      const entity = { id: 1 } as NutMass;
      mockNutMassRepo.findOne.mockResolvedValue(entity);
      mockNutMassRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockNutMassRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
