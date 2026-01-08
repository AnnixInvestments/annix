import { Test, TestingModule } from '@nestjs/testing';
import { FlangeDimensionService } from './flange-dimension.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FlangeDimension } from './entities/flange-dimension.entity';
import { NominalOutsideDiameterMm } from '../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { FlangeStandard } from '../flange-standard/entities/flange-standard.entity';
import { FlangePressureClass } from '../flange-pressure-class/entities/flange-pressure-class.entity';
import { Bolt } from '../bolt/entities/bolt.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('FlangeDimensionService', () => {
  let service: FlangeDimensionService;

  const mockFlangeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockNominalRepo = {
    findOne: jest.fn(),
  };

  const mockStandardRepo = {
    findOne: jest.fn(),
  };

  const mockPressureRepo = {
    findOne: jest.fn(),
  };

  const mockBoltRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlangeDimensionService,
        { provide: getRepositoryToken(FlangeDimension), useValue: mockFlangeRepo },
        { provide: getRepositoryToken(NominalOutsideDiameterMm), useValue: mockNominalRepo },
        { provide: getRepositoryToken(FlangeStandard), useValue: mockStandardRepo },
        { provide: getRepositoryToken(FlangePressureClass), useValue: mockPressureRepo },
        { provide: getRepositoryToken(Bolt), useValue: mockBoltRepo },
      ],
    }).compile();

    service = module.get<FlangeDimensionService>(FlangeDimensionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return array of flange dimensions', async () => {
      const result = [{ id: 1 }] as FlangeDimension[];
      mockFlangeRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockFlangeRepo.find).toHaveBeenCalledWith({
        relations: [
          'nominalOutsideDiameter',
          'standard',
          'pressureClass',
          'bolt',
        ],
      });
    });
  });

  describe('findOne', () => {
    it('should return a flange dimension by id', async () => {
      const result = { id: 1 } as FlangeDimension;
      mockFlangeRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockFlangeRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: [
          'nominalOutsideDiameter',
          'standard',
          'pressureClass',
          'bolt',
        ],
      });
    });

    it('should throw NotFoundException if flange dimension not found', async () => {
      mockFlangeRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a flange dimension', async () => {
      const entity = { id: 1 } as FlangeDimension;
      mockFlangeRepo.findOne.mockResolvedValue(entity);
      mockFlangeRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockFlangeRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
