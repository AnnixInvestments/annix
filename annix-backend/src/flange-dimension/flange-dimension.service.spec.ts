import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FlangeDimension } from "./entities/flange-dimension.entity";
import { FlangeDimensionRepository } from "./flange-dimension.repository";
import { FlangeDimensionService } from "./flange-dimension.service";

describe("FlangeDimensionService", () => {
  let service: FlangeDimensionService;

  const mockRepository = {
    findAllWithRelations: jest.fn(),
    findByIdWithRelations: jest.fn(),
    findNominalById: jest.fn(),
    findStandardById: jest.fn(),
    findPressureClassById: jest.fn(),
    findBoltById: jest.fn(),
    findBoltMassByBoltAndLength: jest.fn(),
    findClosestBoltMass: jest.fn(),
    existsByAllFields: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    findBySpecs: jest.fn(),
    findByCodeAndDesignation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlangeDimensionService,
        {
          provide: FlangeDimensionRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FlangeDimensionService>(FlangeDimensionService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return array of flange dimensions", async () => {
      const result = [{ id: 1 }] as FlangeDimension[];
      mockRepository.findAllWithRelations.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepository.findAllWithRelations).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a flange dimension by id", async () => {
      const result = { id: 1 } as FlangeDimension;
      mockRepository.findByIdWithRelations.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepository.findByIdWithRelations).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if flange dimension not found", async () => {
      mockRepository.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a flange dimension", async () => {
      const entity = { id: 1 } as FlangeDimension;
      mockRepository.findByIdWithRelations.mockResolvedValue(entity);
      mockRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepository.remove).toHaveBeenCalledWith(entity);
    });
  });
});
