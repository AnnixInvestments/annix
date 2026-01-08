import { Test, TestingModule } from '@nestjs/testing';
import { BendDimensionService } from './bend-dimension.service';
import { NotFoundException } from '@nestjs/common';
import { NbNpsLookup } from '../nb-nps-lookup/entities/nb-nps-lookup.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('BendDimensionService', () => {
  let service: BendDimensionService;

  const mockLookupRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BendDimensionService,
        { provide: getRepositoryToken(NbNpsLookup), useValue: mockLookupRepo },
      ],
    }).compile();

    service = module.get<BendDimensionService>(BendDimensionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculate', () => {
    it('should calculate bend center-to-face dimension', async () => {
      const lookup = { id: 1, nb_mm: 50, nps_inch: 2 };
      mockLookupRepo.findOne.mockResolvedValue(lookup);

      const result = await service.calculate(50, 90, 1.5);
      
      // Expected calculation: radius = 1.5 * 2 * 25.4 = 76.2mm
      // tan(45°) = 1, so result = 76.2
      expect(result).toBe(76.2);
      expect(mockLookupRepo.findOne).toHaveBeenCalledWith({
        where: { nb_mm: 50 },
      });
    });

    it('should throw NotFoundException if NB not found', async () => {
      mockLookupRepo.findOne.mockResolvedValue(undefined);

      await expect(service.calculate(999, 90, 1.5)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should round result to 1 decimal place', async () => {
      const lookup = { id: 1, nb_mm: 50, nps_inch: 2 };
      mockLookupRepo.findOne.mockResolvedValue(lookup);

      const result = await service.calculate(50, 45, 1.5);
      
      // Should be rounded to 1 decimal place
      expect(typeof result).toBe('number');
      expect(result * 10 % 1).toBeCloseTo(0, 1);
    });
  });
});
