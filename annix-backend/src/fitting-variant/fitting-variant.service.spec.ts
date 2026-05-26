import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FittingRepository } from "../fitting/fitting.repository";
import { FittingBoreRepository } from "../fitting-bore/fitting-bore.repository";
import { FittingDimensionRepository } from "../fitting-dimension/fitting-dimension.repository";
import { FittingVariant } from "./entities/fitting-variant.entity";
import { FittingVariantRepository } from "./fitting-variant.repository";
import { FittingVariantService } from "./fitting-variant.service";

describe("FittingVariantService", () => {
  let service: FittingVariantService;

  const mockVariantRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockFittingRepo = {
    findById: jest.fn(),
  };

  const mockBoreRepo = {
    instantiate: jest.fn(),
  };

  const mockDimensionRepo = {
    instantiate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FittingVariantService,
        { provide: FittingVariantRepository, useValue: mockVariantRepo },
        { provide: FittingRepository, useValue: mockFittingRepo },
        { provide: FittingBoreRepository, useValue: mockBoreRepo },
        { provide: FittingDimensionRepository, useValue: mockDimensionRepo },
      ],
    }).compile();

    service = module.get<FittingVariantService>(FittingVariantService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return array of fitting variants", async () => {
      const result = [{ id: 1 }] as FittingVariant[];
      mockVariantRepo.findAll.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockVariantRepo.findAll).toHaveBeenCalledWith(["fitting", "bores", "dimensions"]);
    });
  });

  describe("findOne", () => {
    it("should return a fitting variant by id", async () => {
      const result = { id: 1 } as FittingVariant;
      mockVariantRepo.findById.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockVariantRepo.findById).toHaveBeenCalledWith(1, ["fitting", "bores", "dimensions"]);
    });

    it("should throw NotFoundException if fitting variant not found", async () => {
      mockVariantRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a fitting variant", async () => {
      const entity = { id: 1 } as FittingVariant;
      mockVariantRepo.findById.mockResolvedValue(entity);
      mockVariantRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockVariantRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
