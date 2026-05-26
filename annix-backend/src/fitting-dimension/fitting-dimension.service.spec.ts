import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FittingDimension } from "./entities/fitting-dimension.entity";
import { FittingDimensionRepository } from "./fitting-dimension.repository";
import { FittingDimensionService } from "./fitting-dimension.service";

describe("FittingDimensionService", () => {
  let service: FittingDimensionService;

  const mockRepository = {
    findAllWithRelations: jest.fn(),
    findByIdWithRelations: jest.fn(),
    findVariantById: jest.fn(),
    findAngleRangeById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FittingDimensionService,
        {
          provide: FittingDimensionRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FittingDimensionService>(FittingDimensionService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return array of fitting dimensions", async () => {
      const result = [{ id: 1 }] as FittingDimension[];
      mockRepository.findAllWithRelations.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepository.findAllWithRelations).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a fitting dimension by id", async () => {
      const result = { id: 1 } as FittingDimension;
      mockRepository.findByIdWithRelations.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepository.findByIdWithRelations).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if fitting dimension not found", async () => {
      mockRepository.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a fitting dimension", async () => {
      const entity = { id: 1 } as FittingDimension;
      mockRepository.findByIdWithRelations.mockResolvedValue(entity);
      mockRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepository.remove).toHaveBeenCalledWith(entity);
    });
  });
});
